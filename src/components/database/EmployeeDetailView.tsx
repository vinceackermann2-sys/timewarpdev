import { useState, useEffect, useRef } from "react";
import { AIEmployee } from "./EmployeesView";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { ArrowLeft, Trash2, Play, Loader2, CheckCircle2, XCircle, Clock, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExtensionBridge, type BrowserAction } from "@/hooks/useExtensionBridge";

interface LogEntry {
  id: string;
  status: string;
  step_label: string | null;
  message: string | null;
  created_at: string;
}

interface Props {
  employee: AIEmployee;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export function EmployeeDetailView({ employee, onBack, onDelete }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const { extensionConnected, detecting, retryDetection, getPageContext, executeAction, signalStart, signalStop } = useExtensionBridge();

  useEffect(() => {
    loadLogs();
  }, [employee.id]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("ai_employee_logs")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data || []) as unknown as LogEntry[]);
    setLoadingLogs(false);
  };

  const logStep = async (status: string, stepLabel: string, message: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("ai_employee_logs").insert({
      employee_id: employee.id,
      user_id: session.user.id,
      status,
      step_label: stepLabel,
      message,
    });
    await loadLogs();
  };

  const parseActions = (text: string): { steps: BrowserAction[]; summary: string } | null => {
    try {
      // Extract JSON from markdown code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
      const parsed = JSON.parse(jsonStr);

      if (parsed.steps && Array.isArray(parsed.steps)) {
        return { steps: parsed.steps, summary: parsed.summary || "" };
      }
      if (parsed.action) {
        return { steps: [parsed], summary: parsed.reasoning || "" };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleRun = async () => {
    if (!extensionConnected) {
      toast({ title: "Extension not detected", description: "Install and log into the TimeWarp extension to run employees.", variant: "destructive" });
      return;
    }

    setRunning(true);
    signalStart(employee.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setRunning(false); return; }

      // Get page context from extension
      const pageContext = await getPageContext();

      await logStep("running", "Started", `Running SOP: ${employee.sop_title || employee.role}`);

      // Stream from run-employee edge function
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          employee_id: employee.id,
          messages: [{ role: "user", content: `Execute the SOP procedure now. The browser is ready.` }],
          pageContext,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        await logStep("error", "Error", err.error || `HTTP ${resp.status}`);
        toast({ title: "Run failed", description: err.error || "An error occurred", variant: "destructive" });
        setRunning(false);
        signalStop(employee.id);
        return;
      }

      // Read streamed response
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch { /* partial */ }
        }
      }

      // Parse AI response for actions
      const actionPlan = parseActions(fullText);

      if (!actionPlan) {
        // AI responded with text only (no actions)
        await logStep("completed", "Response", fullText.slice(0, 500));
        toast({ title: "Run completed", description: "Employee responded with guidance." });
      } else {
        // Execute each action through the extension
        for (let i = 0; i < actionPlan.steps.length; i++) {
          const step = actionPlan.steps[i];

          if (step.action === "respond") {
            await logStep("running", `Step ${i + 1}`, step.message || step.reasoning || "Response");
            continue;
          }

          await logStep("running", `Step ${i + 1}`, `${step.action}: ${step.reasoning || step.selector || step.url || ""}`);

          const result = await executeAction(step);

          if (!result.success) {
            await logStep("error", `Step ${i + 1} Failed`, result.error || "Action failed");
            toast({ title: "Step failed", description: result.error, variant: "destructive" });
            break;
          }

          await logStep("running", `Step ${i + 1} ✓`, `Completed: ${step.action}`);
        }

        await logStep("completed", "Completed", `Finished executing ${actionPlan.steps.length} step(s). ${actionPlan.summary}`);
        toast({ title: "Run completed", description: `${employee.name} finished executing the SOP.` });
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        await logStep("error", "Error", e.message || "Unknown error");
        toast({ title: "Run failed", description: e.message, variant: "destructive" });
      }
    } finally {
      setRunning(false);
      signalStop(employee.id);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    signalStop(employee.id);
    setRunning(false);
    toast({ title: "Run stopped" });
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );

  const renderList = (items: any[], renderItem?: (item: any, i: number) => React.ReactNode) => {
    if (!items || items.length === 0) return <p className="text-muted-foreground italic">Not specified</p>;
    return (
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground font-mono text-xs mt-0.5 w-5 text-right shrink-0">{i + 1}.</span>
            <span>{renderItem ? renderItem(item, i) : String(item)}</span>
          </li>
        ))}
      </ul>
    );
  };

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />;
    if (status === "error") return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold">{employee.name}</h2>
          <p className="text-xs text-muted-foreground">{employee.role}</p>
        </div>

        {/* Extension status */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {detecting ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Detecting extension…</>
          ) : extensionConnected ? (
            <><Wifi className="h-3.5 w-3.5 text-primary" /> Extension connected</>
          ) : (
            <button onClick={retryDetection} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <WifiOff className="h-3.5 w-3.5 text-destructive" /> Extension not found
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>

        {running ? (
          <Button onClick={handleStop} variant="destructive" size="sm" className="gap-2">
            <XCircle className="h-4 w-4" /> Stop
          </Button>
        ) : (
          <Button
            onClick={handleRun}
            disabled={!extensionConnected || detecting}
            className="gap-2"
            size="sm"
            title={!extensionConnected ? "Install and log into the TimeWarp extension to run employees" : undefined}
          >
            <Play className="h-4 w-4" />
            Run Employee
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => onDelete(employee.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <BusinessBrainOrb size={64} />
            <div>
              <h2 className="text-xl font-semibold">{employee.name}</h2>
              <p className="text-muted-foreground">{employee.role}</p>
            </div>
          </div>

          {!extensionConnected && !detecting && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">Browser extension required</p>
              <p className="text-muted-foreground mt-1">
                Install and log into the TimeWarp browser extension to connect this employee to your browser and execute SOP steps automatically.
              </p>
            </div>
          )}

          {employee.sop_title && <Section title="SOP Title"><p className="font-medium">{employee.sop_title}</p></Section>}
          {employee.sop_purpose && <Section title="Purpose"><p>{employee.sop_purpose}</p></Section>}
          {employee.sop_scope && <Section title="Scope"><p>{employee.sop_scope}</p></Section>}

          {employee.sop_definitions && employee.sop_definitions.length > 0 && (
            <Section title="Definitions">
              {renderList(employee.sop_definitions, (d) => (
                <span><strong>{d.term}:</strong> {d.meaning}</span>
              ))}
            </Section>
          )}

          <Section title="Procedure">
            {renderList(employee.sop_procedure)}
          </Section>

          {employee.sop_safety_notes && <Section title="Safety / Compliance Notes"><p>{employee.sop_safety_notes}</p></Section>}

          {employee.sop_revision_history && employee.sop_revision_history.length > 0 && (
            <Section title="Revision History">
              <div className="space-y-1">
                {employee.sop_revision_history.map((rev: any, i: number) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="font-mono text-muted-foreground">{rev.version}</span>
                    <span className="text-muted-foreground">{rev.date}</span>
                    <span>{rev.notes}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Activity Log */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Activity Log</h3>
            {loadingLogs ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No activity yet. Click "Run Employee" to execute the SOP.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto border border-border rounded-lg p-3 bg-muted/20">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2.5 text-sm">
                    {statusIcon(log.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {log.step_label && (
                          <span className="font-medium text-xs bg-muted px-1.5 py-0.5 rounded">{log.step_label}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {log.message && <p className="text-xs text-muted-foreground mt-0.5">{log.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
