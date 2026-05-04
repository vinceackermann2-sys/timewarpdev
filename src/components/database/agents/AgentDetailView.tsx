import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Trash2,
  Loader2,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Workflow,
  ShieldCheck,
  UserCog,
  Plug,
  Clock,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AIAgent,
  AgentRun,
  AgentRunStatus,
  AgentStatus,
  STATUS_LABEL,
  TRIGGER_TYPE_LABEL,
  normalizeAgentRow,
} from "./types";

interface Props {
  agent: AIAgent;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: (updated: AIAgent) => void;
}

const RUN_STATUS_ICON: Record<AgentRunStatus, React.ComponentType<{ className?: string }>> = {
  running: Loader2,
  success: CheckCircle2,
  failure: XCircle,
  escalated: AlertTriangle,
};

const RUN_STATUS_TONE: Record<AgentRunStatus, string> = {
  running: "text-muted-foreground",
  success: "text-emerald-600",
  failure: "text-destructive",
  escalated: "text-amber-600",
};

export function AgentDetailView({ agent, onBack, onDeleted, onUpdated }: Props) {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [running, setRunning] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [supervisorName, setSupervisorName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRuns(true);
      const { data } = await supabase
        .from("ai_agent_runs")
        .select("*")
        .eq("agent_id", agent.id)
        .order("started_at", { ascending: false })
        .limit(20);
      if (!cancelled) {
        setRuns((data || []) as AgentRun[]);
        setLoadingRuns(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agent.id]);

  useEffect(() => {
    if (!agent.supervisor_employee_id) {
      setSupervisorName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ai_employees")
        .select("name, role")
        .eq("id", agent.supervisor_employee_id)
        .maybeSingle();
      if (!cancelled && data) {
        setSupervisorName(`${data.name} — ${data.role}`);
      }
    })();
    return () => { cancelled = true; };
  }, [agent.supervisor_employee_id]);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ agent_id: agent.id, trigger_kind: "manual" }),
        },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);

      const status: AgentRunStatus = body.status === "escalated"
        ? "escalated"
        : body.status === "failure" ? "failure" : "success";
      toast.success(`Run ${status}`, {
        description: status === "escalated" ? "Agent escalated — see run output." : undefined,
      });

      // Refresh runs + parent agent counters.
      const [{ data: newRuns }, { data: refreshed }] = await Promise.all([
        supabase.from("ai_agent_runs").select("*").eq("agent_id", agent.id).order("started_at", { ascending: false }).limit(20),
        supabase.from("ai_agents").select("*").eq("id", agent.id).maybeSingle(),
      ]);
      setRuns((newRuns || []) as AgentRun[]);
      if (refreshed) onUpdated(normalizeAgentRow(refreshed));
    } catch (err: any) {
      toast.error("Run failed", { description: err.message });
    } finally {
      setRunning(false);
    }
  };

  const handleStatusChange = async (next: AgentStatus) => {
    setStatusUpdating(true);
    try {
      const { data, error } = await supabase
        .from("ai_agents")
        .update({ status: next })
        .eq("id", agent.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (data) onUpdated(normalizeAgentRow(data));
      toast.success(`Agent ${STATUS_LABEL[next].toLowerCase()}`);
    } catch (err: any) {
      toast.error("Could not update status", { description: err.message });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("ai_agents").delete().eq("id", agent.id);
    if (error) {
      toast.error("Could not delete agent", { description: error.message });
      return;
    }
    toast.success("Agent deleted");
    onDeleted();
  };

  const statusTone =
    agent.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      : agent.status === "paused" ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
      : "bg-muted text-muted-foreground";

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to agents
        </button>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                {agent.name}
              </h1>
              <Badge className={cn("capitalize", statusTone)}>{STATUS_LABEL[agent.status]}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {agent.execution_mode === "computer" ? "Computer-based" : "API-based"}
              </Badge>
            </div>
            {agent.description && <p className="text-sm text-muted-foreground mt-1.5">{agent.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{agent.run_count} run{agent.run_count !== 1 ? "s" : ""}</span>
              {agent.last_run_at && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last: {new Date(agent.last_run_at).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {agent.status !== "active" && (
              <Button variant="outline" size="sm" disabled={statusUpdating} onClick={() => handleStatusChange("active")}>
                <PlayCircle className="h-4 w-4 mr-1.5" /> Activate
              </Button>
            )}
            {agent.status === "active" && (
              <Button variant="outline" size="sm" disabled={statusUpdating} onClick={() => handleStatusChange("paused")}>
                <Pause className="h-4 w-4 mr-1.5" /> Pause
              </Button>
            )}
            <Button onClick={handleRunNow} disabled={running} className="gap-1.5">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run now
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the agent and its run history. This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Spec cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SpecCard icon={Zap} title="Trigger">
            <KV label="Type" value={TRIGGER_TYPE_LABEL[agent.trigger_type]} />
            {agent.trigger_source && <KV label="Source" value={agent.trigger_source} />}
            {agent.trigger_condition && <KV label="Condition" value={agent.trigger_condition} />}
            {agent.trigger_schedule && <KV label="Schedule" value={agent.trigger_schedule} />}
          </SpecCard>

          <SpecCard icon={Plug} title="Required integrations">
            {(agent.required_integrations ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">None.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(agent.required_integrations ?? []).map((id) => (
                  <Badge key={id} variant="secondary" className="text-[11px] capitalize">
                    {id.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}
          </SpecCard>

          <SpecCard icon={UserCog} title="Supervising employee" className="md:col-span-2">
            {supervisorName ? (
              <p className="text-sm">{supervisorName}</p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">No supervisor assigned. Activate an Employee to oversee this agent.</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/app/employees")}>
                  Browse employees →
                </Button>
              </div>
            )}
          </SpecCard>

          <SpecCard icon={Workflow} title="SOP" className="md:col-span-2">
            {(agent.sop_steps ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No steps defined.</p>
            ) : (
              <ol className="space-y-2">
                {(agent.sop_steps ?? []).map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{step.label}</p>
                      {step.detail && <p className="text-xs text-muted-foreground">{step.detail}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {agent.sop_output && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Expected output</p>
                <p className="text-sm">{agent.sop_output}</p>
              </div>
            )}
          </SpecCard>

          <SpecCard icon={ShieldCheck} title="Safety boundary" className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 mb-1">Can do</p>
                {(agent.safety_can_do ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">(none specified)</p>
                ) : (
                  <ul className="space-y-1">
                    {(agent.safety_can_do ?? []).map((c, i) => (
                      <li key={i} className="text-xs">✅ {c}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive mb-1">Cannot do</p>
                {(agent.safety_cannot_do ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">(none specified)</p>
                ) : (
                  <ul className="space-y-1">
                    {(agent.safety_cannot_do ?? []).map((c, i) => (
                      <li key={i} className="text-xs">❌ {c}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {agent.safety_escalation_path && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1">🚨 Escalation</p>
                <p className="text-sm">{agent.safety_escalation_path}</p>
              </div>
            )}
          </SpecCard>
        </div>

        {/* Runs */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold text-sm mb-3">Recent runs</h2>
          {loadingRuns ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : runs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No runs yet. Click "Run now" to test.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {runs.map((run) => {
                const status = run.status as AgentRunStatus;
                const Icon = RUN_STATUS_ICON[status];
                return (
                  <li key={run.id} className="py-3 flex items-start gap-3">
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", RUN_STATUS_TONE[status], status === "running" && "animate-spin")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{status} · <span className="font-normal text-muted-foreground">{run.trigger_kind}</span></p>
                      {run.message && <p className="text-xs text-muted-foreground">{run.message}</p>}
                      {run.error && <p className="text-xs text-destructive mt-0.5">{run.error}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{new Date(run.started_at).toLocaleString()}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-5", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
