import { useState, useEffect } from "react";
import { AIEmployee } from "./EmployeesView";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { ArrowLeft, Trash2, Play, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    loadLogs();
  }, [employee.id]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("ai_employee_logs" as any)
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data || []) as unknown as LogEntry[]);
    setLoadingLogs(false);
  };

  const handleRun = async () => {
    setRunning(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setRunning(false); return; }

    const userId = session.user.id;

    // Log: started
    await supabase.from("ai_employee_logs" as any).insert({
      employee_id: employee.id,
      user_id: userId,
      status: "running",
      step_label: "Started",
      message: `Running SOP: ${employee.sop_title || employee.role}`,
    } as any);

    // Simulate SOP procedure execution step by step
    const steps = Array.isArray(employee.sop_procedure) ? employee.sop_procedure : [];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      await supabase.from("ai_employee_logs" as any).insert({
        employee_id: employee.id,
        user_id: userId,
        status: "running",
        step_label: `Step ${i + 1}`,
        message: String(steps[i]),
      } as any);
      await loadLogs();
    }

    // Log: completed
    await supabase.from("ai_employee_logs" as any).insert({
      employee_id: employee.id,
      user_id: userId,
      status: "completed",
      step_label: "Completed",
      message: `Finished executing ${steps.length} step${steps.length !== 1 ? "s" : ""} successfully.`,
    } as any);

    await loadLogs();
    setRunning(false);
    toast({ title: "Run completed", description: `${employee.name} finished executing the SOP.` });
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
    if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />;
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
        <Button
          onClick={handleRun}
          disabled={running}
          className="gap-2"
          size="sm"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running…" : "Run Employee"}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(employee.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <BusinessBrainOrb size={64} />
            <div>
              <h2 className="text-xl font-semibold">{employee.name}</h2>
              <p className="text-muted-foreground">{employee.role}</p>
            </div>
          </div>

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
