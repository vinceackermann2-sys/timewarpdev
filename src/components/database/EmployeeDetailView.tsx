import { useState, useEffect, useRef, useCallback } from "react";
import { AIEmployee } from "./EmployeesView";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { ArrowLeft, Trash2, Play, Loader2, CheckCircle2, XCircle, Clock, Wifi, WifiOff, RefreshCw, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExtensionBridge, type BrowserAction } from "@/hooks/useExtensionBridge";
import { useActionGate } from "@/hooks/useActionGate";

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

// Safety: blocked action keywords
const BLOCKED_ACTIONS = [
  "pay", "purchase", "buy", "checkout", "place order", "subscribe",
  "sign up", "register", "create account",
  "log in", "sign in", "login", "signin",
];

function isSafetyBlocked(action: any): string | null {
  const actionStr = JSON.stringify(action).toLowerCase();

  // Check for payment-related actions
  if (/\b(pay|purchase|buy|checkout|place.?order|add.?to.?cart.*checkout)\b/.test(actionStr)) {
    return "Blocked: payment action detected. Manual takeover required.";
  }
  // Check for signup
  if (/\b(sign.?up|register|create.?account|registration)\b/.test(actionStr)) {
    return "Blocked: account creation detected. Manual takeover required.";
  }
  // Check for login
  if (/\b(log.?in|sign.?in|password|authenticate)\b/.test(actionStr)) {
    return "Blocked: login action detected. Manual takeover required.";
  }
  // Check for sensitive data entry (credit card patterns, SSN patterns)
  if (/\b(credit.?card|card.?number|cvv|ssn|social.?security)\b/.test(actionStr)) {
    return "Blocked: sensitive data entry detected. Manual takeover required.";
  }
  return null;
}

export function EmployeeDetailView({ employee, onBack, onDelete }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [running, setRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const pauseResolverRef = useRef<(() => void) | null>(null);
  const isPausedRef = useRef(false);
  const isManualModeRef = useRef(false);
  const { extensionConnected, detecting, retryDetection, getPageContext, executeAction, signalStart, signalStop, updateOverlay } = useExtensionBridge();
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const { checkCanUseAction } = useActionGate();

  useEffect(() => { loadLogs(); }, [employee.id]);

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

  const waitForUnpause = useCallback((): Promise<void> => {
    if (!isPausedRef.current && !isManualModeRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      pauseResolverRef.current = resolve;
    });
  }, []);

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    setSafetyAlert(null);
    updateOverlay({ visible: true, employeeName: employee.name, currentStep, isPaused: true, isManualMode: false, safetyAlert: null });
  };

  const handleContinue = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    setIsManualMode(false);
    isManualModeRef.current = false;
    setSafetyAlert(null);
    pauseResolverRef.current?.();
    pauseResolverRef.current = null;
    updateOverlay({ visible: true, employeeName: employee.name, currentStep, isPaused: false, isManualMode: false, safetyAlert: null });
  };

  const handleManualTakeover = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    setIsManualMode(true);
    isManualModeRef.current = true;
    updateOverlay({ visible: true, employeeName: employee.name, currentStep, isPaused: true, isManualMode: true, safetyAlert });
  };

  const handleReturnControl = () => {
    setIsManualMode(false);
    isManualModeRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setSafetyAlert(null);
    pauseResolverRef.current?.();
    pauseResolverRef.current = null;
    updateOverlay({ visible: true, employeeName: employee.name, currentStep, isPaused: false, isManualMode: false, safetyAlert: null });
  };

  const parseAction = (text: string): (BrowserAction & { done?: boolean; message?: string }) | null => {
    try {
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.action) return parsed;
      return null;
    } catch {
      return null;
    }
  };

  const callRunEmployee = async (
    session: any,
    messages: Array<{ role: string; content: string }>,
    pageContext: any
  ): Promise<string> => {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-employee`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        employee_id: employee.id,
        messages,
        pageContext,
      }),
      signal: abortRef.current?.signal,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.content || "";
  };

  const handleRun = async () => {
    if (!extensionConnected) {
      toast({ title: "Extension not detected", description: "Install and log into the TimeWarp extension to run employees.", variant: "destructive" });
      return;
    }
    if (!checkCanUseAction()) return;

    setRunning(true);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsManualMode(false);
    isManualModeRef.current = false;
    setSafetyAlert(null);
    setCurrentStep("Preparing tab group…");
    updateOverlay({ visible: true, employeeName: employee.name, currentStep: "Preparing tab group…", isPaused: false, isManualMode: false });
    await signalStart(employee.id, employee.name);
    setCurrentStep("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setRunning(false); return; }

      await logStep("running", "Started", `Running SOP: ${employee.sop_title || employee.role}`);

      // Small delay to let extension set up the tab group
      await new Promise(r => setTimeout(r, 1200));

      const procedureSteps = Array.isArray(employee.sop_procedure) ? employee.sop_procedure : [];
      const stepCount = procedureSteps.length;

      const conversationHistory: Array<{ role: string; content: string }> = [
        { role: "user", content: `Execute the FULL SOP procedure now, step by step. You have ${stepCount} procedure steps to complete. Start with step 1 immediately — navigate to the correct URL. There is no page context yet because you need to open the first page yourself. Do NOT return "done" until every single procedure step has been completed. Work through ALL ${stepCount} steps sequentially.` },
      ];

      const MAX_STEPS = 80;

      for (let step = 0; step < MAX_STEPS; step++) {
        if (abortRef.current?.signal.aborted) break;

        // Wait if paused or manual mode (use refs for fresh values)
        if (isPausedRef.current || isManualModeRef.current) {
          await waitForUnpause();
        }
        if (abortRef.current?.signal.aborted) break;

        const pageContext = await getPageContext();

        setCurrentStep(`Step ${step + 1}: Thinking…`);
        updateOverlay({ visible: true, employeeName: employee.name, currentStep: `Step ${step + 1}: Thinking…`, isPaused: false, isManualMode: false });
        await logStep("running", `Step ${step + 1}`, "Thinking…");
        const aiResponse = await callRunEmployee(session, conversationHistory, pageContext);

        conversationHistory.push({ role: "assistant", content: aiResponse });

        const action = parseAction(aiResponse);

        if (!action) {
          // Retry: AI responded with plain text instead of JSON — ask it to fix
          conversationHistory.push({
            role: "user",
            content: `Your response was not valid JSON. You MUST always respond with a JSON code block. Re-read the SOP and continue from where you left off. Respond with the next action as a JSON code block.`,
          });
          await logStep("running", `Step ${step + 1}`, "Retrying: AI did not return JSON");
          continue;
        }

        if (action.done || action.action === "done") {
          setCurrentStep("Completed");
          updateOverlay({ visible: false });
          await logStep("completed", "Completed", action.message || "SOP execution finished.");
          toast({ title: "Run completed", description: `${employee.name} finished executing the SOP.` });
          break;
        }

        // Safety check BEFORE execution
        const safetyBlock = isSafetyBlocked(action);
        if (safetyBlock) {
          setSafetyAlert(safetyBlock);
          setIsPaused(true);
          isPausedRef.current = true;
          setIsManualMode(true);
          isManualModeRef.current = true;
          await logStep("running", `Step ${step + 1} ⚠️`, `SAFETY: ${safetyBlock}`);

          // Wait for user to handle manually and return control
          await new Promise<void>((resolve) => {
            pauseResolverRef.current = resolve;
          });

          if (abortRef.current?.signal.aborted) break;

          // After manual takeover, tell AI the user handled it
          conversationHistory.push({
            role: "user",
            content: `The user manually completed the sensitive action (${action.action}). Continue with the next SOP step. Get fresh page context.`,
          });
          setSafetyAlert(null);
          continue;
        }

        if (action.action === "respond") {
          setCurrentStep(`Step ${step + 1}: ${action.message?.slice(0, 60) || "Message"}`);
          await logStep("running", `Step ${step + 1}`, action.message || action.reasoning || "Response");
          conversationHistory.push({
            role: "user",
            content: `User saw your message. Continue with the next SOP step.`,
          });
          continue;
        }

        setCurrentStep(`Step ${step + 1}: ${action.action}`);
        updateOverlay({ visible: true, employeeName: employee.name, currentStep: `Step ${step + 1}: ${action.action}`, isPaused: false, isManualMode: false });
        await logStep("running", `Step ${step + 1}`, `${action.action}: ${action.reasoning || action.selector || action.url || ""}`);

        const result = await executeAction(action, true) || { success: false, action: action.action, error: "No response from extension" };

        const resultMsg = result.success
          ? `Action "${action.action}" succeeded.${result.data ? ` Data: ${JSON.stringify(result.data)}` : ""}`
          : `Action "${action.action}" failed: ${result.error || "unknown error"}`;

        // Include fresh page context so AI knows current state
        const freshContext = await getPageContext();
        const contextInfo = freshContext?.url ? ` Current page: ${freshContext.url}` : "";
        conversationHistory.push({ role: "user", content: resultMsg + contextInfo + ` Continue with the next SOP step. You have ${stepCount} total steps to complete.` });

        if (result.success) {
          await logStep("running", `Step ${step + 1} ✓`, `Completed: ${action.action}`);
        } else {
          await logStep("error", `Step ${step + 1} ✗`, result.error || "Action failed");
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        await logStep("error", "Error", e.message || "Unknown error");
        toast({ title: "Run failed", description: e.message, variant: "destructive" });
      }
    } finally {
      setRunning(false);
      setIsPaused(false);
      isPausedRef.current = false;
      setIsManualMode(false);
      isManualModeRef.current = false;
      setSafetyAlert(null);
      setCurrentStep("");
      updateOverlay({ visible: false });
      signalStop(employee.id);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    updateOverlay({ visible: false });
    signalStop(employee.id);
    setRunning(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsManualMode(false);
    isManualModeRef.current = false;
    setSafetyAlert(null);
    pauseResolverRef.current?.();
    pauseResolverRef.current = null;
    toast({ title: "Run stopped" });
  };

  const toggleResultExpand = (logId: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
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

        {!running && (
          <>
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
            <Button variant="ghost" size="icon" onClick={() => onDelete(employee.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
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

          <Section title="Procedure">{renderList(employee.sop_procedure)}</Section>

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
                {logs.map(log => {
                  const isResult = log.status === "completed" && log.message && log.message.length > 40;
                  const isExpanded = expandedResults.has(log.id);

                  return (
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
                          {isResult && (
                            <button
                              onClick={() => toggleResultExpand(log.id)}
                              className="flex items-center gap-1 text-[11px] text-primary hover:underline ml-auto"
                            >
                              <FileText className="h-3 w-3" />
                              {isExpanded ? "Collapse" : "View Results"}
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                        {isResult && isExpanded ? (
                          <div className="mt-2 rounded-lg border border-border bg-background p-3 text-xs whitespace-pre-wrap">
                            {log.message}
                          </div>
                        ) : log.message ? (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.message}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Running indicator - minimal, overlay is in the extension group tab */}
      {running && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 backdrop-blur-xl shadow-lg px-4 py-2">
            <BusinessBrainOrb size={24} />
            <span className="text-sm font-medium">{employee.name}</span>
            <span className="text-xs text-muted-foreground">{currentStep || "Running…"}</span>
            <Button onClick={handleStop} variant="destructive" size="sm" className="h-7 text-xs">
              Stop
            </Button>
          </div>
        </div>
      )}
      <ActionsDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
}
