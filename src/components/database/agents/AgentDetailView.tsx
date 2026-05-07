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
  Plus,
  X,
  Pencil,
} from "lucide-react";
import logoGmail from "@/assets/logo-gmail.svg";
import logoGcal from "@/assets/logo-google-calendar.svg";
import logoOutlook from "@/assets/logo-ms-outlook.svg";
import logoHubspot from "@/assets/logo-hubspot.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoZoom from "@/assets/logo-zoom.svg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  AgentSopStep,
  AgentStatus,
  AgentTriggerType,
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
      <div className="max-w-7xl mx-auto">
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

        <AgentTabs agent={agent} runs={runs} loadingRuns={loadingRuns} supervisorName={supervisorName} onUpdated={onUpdated} />
      </div>
    </div>
  );
}

function AgentTabs({
  agent,
  runs,
  loadingRuns,
  supervisorName,
  onUpdated,
}: {
  agent: AIAgent;
  runs: AgentRun[];
  loadingRuns: boolean;
  supervisorName: string | null;
  onUpdated: (updated: AIAgent) => void;
}) {
  const [tab, setTab] = useState<"workflow" | "dashboard" | "settings">("workflow");

  const successRuns = runs.filter((r) => r.status === "success").length;
  const failedRuns = runs.filter((r) => r.status === "failure").length;
  const escalatedRuns = runs.filter((r) => r.status === "escalated").length;
  const successRate = runs.length > 0 ? Math.round((successRuns / runs.length) * 100) : 0;

  return (
    <div>
      {/* Tab switcher — pill style matching reference */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card p-1 shadow-sm">
          {(["workflow", "dashboard", "settings"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm capitalize transition-colors",
                tab === key
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "workflow" ? "Workflow" : key === "dashboard" ? "Dashboard" : "Settings"}
            </button>
          ))}
        </div>
      </div>

      {tab === "workflow" && <WorkflowTab agent={agent} onUpdated={onUpdated} />}
      {tab === "dashboard" && (
        <DashboardTab
          agent={agent}
          runs={runs}
          loadingRuns={loadingRuns}
          successRate={successRate}
          successRuns={successRuns}
          failedRuns={failedRuns}
          escalatedRuns={escalatedRuns}
        />
      )}
      {tab === "settings" && <SettingsTab agent={agent} supervisorName={supervisorName} onUpdated={onUpdated} />}
    </div>
  );
}

/* ---------- Workflow tab — large, editable canvas ---------- */

const INTEGRATION_OPTIONS = [
  "gmail", "outlook", "google_calendar", "google_drive", "google_sheets",
  "hubspot", "slack", "zoom", "stripe", "microsoft_teams", "onedrive", "onenote",
];

type EditTarget =
  | { kind: "trigger" }
  | { kind: "step"; index: number }
  | { kind: "output" };

function WorkflowTab({ agent }: { agent: AIAgent; onUpdated: (a: AIAgent) => void }) {
  const steps = agent.sop_steps || [];

  // Build node list: trigger → steps → output
  type Node = {
    id: string;
    kind: "trigger" | "step" | "output";
    title: string;
    subtitle?: string | null;
    index?: number;
    integrations?: string[];
  };
  const nodes: Node[] = [
    {
      id: "trigger",
      kind: "trigger",
      title: agent.trigger_type === "schedule" ? "Schedule" : agent.trigger_type === "manual" ? "Manual run" : agent.trigger_type === "event" ? "Event" : "Threshold",
      subtitle: agent.trigger_schedule || agent.trigger_condition || agent.trigger_source || undefined,
    },
    ...steps.map((s, i) => ({
      id: `step-${i}`,
      kind: "step" as const,
      title: s.label,
      subtitle: s.detail,
      index: i + 1,
      integrations: s.integrations as string[] | undefined,
    })),
    {
      id: "output",
      kind: "output" as const,
      title: "Output",
      subtitle: agent.sop_output || "No output configured",
    },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border/60">
        <div>
          <h2 className="font-semibold text-base">SOP Workflow</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Read-only view of the configured agent flow. Edit fields and integrations from Settings.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] capitalize">
          Trigger: {agent.trigger_type}
        </Badge>
      </div>

      {/* Big canvas — bezier-connected horizontal flow */}
      <div className="relative bg-[radial-gradient(circle,_hsl(var(--border))_1px,_transparent_1px)] [background-size:16px_16px] overflow-x-auto">
        <div className="relative min-w-max p-12">
          {/* SVG layer for bezier connectors */}
          <FlowConnectors count={nodes.length} />
          {/* Nodes row (above the SVG) */}
          <div className="relative flex items-stretch gap-24">
            {nodes.map((n) => (
              <FlowNode
                key={n.id}
                kind={n.kind}
                title={n.title}
                subtitle={n.subtitle}
                index={n.index}
                integrations={n.integrations}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend — matches reference */}
      <div className="border-t border-border/60 px-6 py-4">
        <div className="inline-flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 text-xs">
          <p className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Legend</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground -mb-1">Steps</p>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border-2 border-primary/60 bg-primary/10" /> Automated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border-2 border-emerald-500/60 bg-emerald-500/10" /> Approval
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border-2 border-foreground/30 bg-card" /> Manual action
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border-2 border-dashed border-amber-500/60 bg-amber-500/5" /> Conditional
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground -mb-1 pt-1 border-t border-border/40">Connections</p>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <svg width="28" height="8" viewBox="0 0 28 8"><path d="M0 4 H22" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M20 1 L26 4 L20 7" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
              Next step
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <svg width="28" height="8" viewBox="0 0 28 8"><path d="M0 4 H22" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 3"/><path d="M20 1 L26 4 L20 7" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
              Triggered when applicable
            </span>
            <span className="flex items-center gap-1.5 text-destructive">
              <svg width="28" height="8" viewBox="0 0 28 8"><path d="M26 4 H4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 3"/><path d="M8 1 L2 4 L8 7" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
              Sent back for revision
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** SVG layer that draws smooth bezier connectors between adjacent nodes.
 *  Nodes are 240px (w-60) and the gap between them is 96px (gap-24).
 *  We position the SVG absolutely behind the node row and route a curve
 *  from the right edge of node N to the left edge of node N+1. */
function FlowConnectors({ count }: { count: number }) {
  if (count < 2) return null;
  const NODE_W = 240;
  const GAP = 96;
  const NODE_H = 140;
  const PAD = 48; // matches p-12
  const totalW = count * NODE_W + (count - 1) * GAP + PAD * 2;
  const cy = PAD + NODE_H / 2;
  const segments = Array.from({ length: count - 1 }, (_, i) => {
    const x1 = PAD + (i + 1) * NODE_W + i * GAP;
    const x2 = x1 + GAP;
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${cy} C ${mid} ${cy}, ${mid} ${cy}, ${x2} ${cy}`;
  });
  return (
    <svg
      className="absolute inset-0 pointer-events-none text-muted-foreground/50"
      width={totalW}
      height={PAD * 2 + NODE_H}
      viewBox={`0 0 ${totalW} ${PAD * 2 + NODE_H}`}
      fill="none"
    >
      <defs>
        <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {segments.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="1.5" markerEnd="url(#flow-arrow)" />
      ))}
    </svg>
  );
}

function FlowNode({
  kind,
  title,
  subtitle,
  index,
  integrations,
}: {
  kind: "trigger" | "step" | "output";
  title: string;
  subtitle?: string | null;
  index?: number;
  integrations?: string[];
}) {
  const tone =
    kind === "trigger"
      ? "border-foreground/30 bg-card"
      : kind === "output"
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-primary/40 bg-primary/5";
  return (
    <div className={cn("relative w-60 min-h-[140px] rounded-xl border-2 p-4 shadow-sm shrink-0", tone)}>
      {kind === "step" && index != null && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Step {index}</p>
      )}
      {kind === "trigger" && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Trigger</p>
      )}
      {kind === "output" && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">Output</p>
      )}
      <p className="text-sm font-semibold leading-snug">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-4">{subtitle}</p>}
      {integrations && integrations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {integrations.slice(0, 4).map((i) => (
            <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{i.replace(/_/g, " ")}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Node editor sheet (right panel) ---------- */

function NodeEditorSheet({
  agent,
  editing,
  saving,
  onClose,
  onSaveTrigger,
  onSaveStep,
  onSaveOutput,
}: {
  agent: AIAgent;
  editing: EditTarget | null;
  saving: boolean;
  onClose: () => void;
  onSaveTrigger: (patch: Partial<AIAgent>) => void;
  onSaveStep: (i: number, patch: Partial<AgentSopStep>) => void;
  onSaveOutput: (out: string) => void;
}) {
  const open = !!editing;

  // Local form state — initialised from agent when sheet opens
  const [triggerType, setTriggerType] = useState<AgentTriggerType>(agent.trigger_type);
  const [triggerSchedule, setTriggerSchedule] = useState(agent.trigger_schedule || "");
  const [triggerCondition, setTriggerCondition] = useState(agent.trigger_condition || "");
  const [triggerSource, setTriggerSource] = useState(agent.trigger_source || "");

  const [stepLabel, setStepLabel] = useState("");
  const [stepDetail, setStepDetail] = useState("");
  const [stepIntegrations, setStepIntegrations] = useState<string[]>([]);
  const [outputText, setOutputText] = useState(agent.sop_output || "");

  useEffect(() => {
    if (!editing) return;
    if (editing.kind === "trigger") {
      setTriggerType(agent.trigger_type);
      setTriggerSchedule(agent.trigger_schedule || "");
      setTriggerCondition(agent.trigger_condition || "");
      setTriggerSource(agent.trigger_source || "");
    } else if (editing.kind === "step") {
      const s = (agent.sop_steps || [])[editing.index] as any;
      setStepLabel(s?.label || "");
      setStepDetail(s?.detail || "");
      setStepIntegrations(Array.isArray(s?.integrations) ? s.integrations : []);
    } else {
      setOutputText(agent.sop_output || "");
    }
  }, [editing, agent]);

  const toggleIntegration = (key: string) => {
    setStepIntegrations((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {editing?.kind === "trigger" ? "Edit trigger"
              : editing?.kind === "output" ? "Edit output"
              : `Edit step ${editing?.kind === "step" ? editing.index + 1 : ""}`}
          </SheetTitle>
          <SheetDescription>
            {editing?.kind === "trigger"
              ? "What kicks off this agent run."
              : editing?.kind === "output"
                ? "What this agent produces or reports when done."
                : "Atomic action this agent performs."}
          </SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-4">
          {editing?.kind === "trigger" && (
            <>
              <div className="space-y-1.5">
                <Label>Trigger type</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as AgentTriggerType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual — user clicks Run now</SelectItem>
                    <SelectItem value="schedule">Schedule — runs on a cadence</SelectItem>
                    <SelectItem value="event">Event — integration emits something</SelectItem>
                    <SelectItem value="threshold">Threshold — metric crosses value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {triggerType === "schedule" && (
                <div className="space-y-1.5">
                  <Label>Schedule</Label>
                  <Input value={triggerSchedule} onChange={(e) => setTriggerSchedule(e.target.value)} placeholder="e.g. Every weekday at 9am" />
                </div>
              )}
              {(triggerType === "event" || triggerType === "threshold") && (
                <>
                  <div className="space-y-1.5">
                    <Label>Source</Label>
                    <Input value={triggerSource} onChange={(e) => setTriggerSource(e.target.value)} placeholder="e.g. slack:#product-feedback" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Condition</Label>
                    <Textarea value={triggerCondition} onChange={(e) => setTriggerCondition(e.target.value)} placeholder="e.g. New message not from a bot" />
                  </div>
                </>
              )}
            </>
          )}

          {editing?.kind === "step" && (
            <>
              <div className="space-y-1.5">
                <Label>Step label</Label>
                <Input value={stepLabel} onChange={(e) => setStepLabel(e.target.value)} placeholder="e.g. Read incoming message" />
              </div>
              <div className="space-y-1.5">
                <Label>Detail / acceptance criteria</Label>
                <Textarea rows={4} value={stepDetail} onChange={(e) => setStepDetail(e.target.value)} placeholder="What does this step do, exactly?" />
              </div>
              <div className="space-y-1.5">
                <Label>Integrations used</Label>
                <div className="flex flex-wrap gap-1.5">
                  {INTEGRATION_OPTIONS.map((key) => {
                    const active = stepIntegrations.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleIntegration(key)}
                        className={cn(
                          "px-2.5 py-1 rounded-full border text-xs capitalize transition-colors",
                          active
                            ? "bg-primary/10 border-primary/60 text-primary"
                            : "bg-card border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {key.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {editing?.kind === "output" && (
            <div className="space-y-1.5">
              <Label>Output description</Label>
              <Textarea
                rows={5}
                value={outputText}
                onChange={(e) => setOutputText(e.target.value)}
                placeholder="What does this agent produce or report when it's done?"
              />
            </div>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={() => {
              if (editing?.kind === "trigger") {
                onSaveTrigger({
                  trigger_type: triggerType,
                  trigger_schedule: triggerSchedule || null,
                  trigger_condition: triggerCondition || null,
                  trigger_source: triggerSource || null,
                } as any);
              } else if (editing?.kind === "step") {
                onSaveStep(editing.index, {
                  label: stepLabel,
                  detail: stepDetail,
                  integrations: stepIntegrations,
                } as any);
              } else if (editing?.kind === "output") {
                onSaveOutput(outputText);
              }
            }}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Dashboard tab ---------- */

function DashboardTab({
  agent,
  runs,
  loadingRuns,
  successRate,
  successRuns,
  failedRuns,
  escalatedRuns,
}: {
  agent: AIAgent;
  runs: AgentRun[];
  loadingRuns: boolean;
  successRate: number;
  successRuns: number;
  failedRuns: number;
  escalatedRuns: number;
}) {
  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total runs" value={String(agent.run_count)} hint={agent.last_run_at ? `Last: ${new Date(agent.last_run_at).toLocaleDateString()}` : "Never run"} />
        <StatCard label="Success rate" value={`${successRate}%`} tone="success" hint={`${successRuns} of ${runs.length} recent`} />
        <StatCard label="Failures" value={String(failedRuns)} tone={failedRuns > 0 ? "danger" : "muted"} hint="In last 20 runs" />
        <StatCard label="Escalated" value={String(escalatedRuns)} tone={escalatedRuns > 0 ? "warning" : "muted"} hint="Needs human review" />
      </div>

      {/* Run history */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="font-semibold text-sm mb-3">Run history</h2>
        {loadingRuns ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No runs yet. Click "Run now" to test.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger" | "warning" | "muted";
}) {
  const valueTone =
    tone === "success" ? "text-emerald-600"
      : tone === "danger" ? "text-destructive"
      : tone === "warning" ? "text-amber-600"
      : tone === "muted" ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold mt-1", valueTone)}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

/* ---------- Settings tab — safety, trigger, integrations ---------- */

function SettingsTab({
  agent,
  supervisorName,
  onUpdated,
}: {
  agent: AIAgent;
  supervisorName: string | null;
  onUpdated: (a: AIAgent) => void;
}) {
  const [canDo, setCanDo] = useState<string[]>(agent.safety_can_do);
  const [cannotDo, setCannotDo] = useState<string[]>(agent.safety_cannot_do);
  const [escalation, setEscalation] = useState(agent.safety_escalation_path || "");
  const [requiredInts, setRequiredInts] = useState<string[]>(agent.required_integrations);
  const [newCan, setNewCan] = useState("");
  const [newCannot, setNewCannot] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCanDo(agent.safety_can_do);
    setCannotDo(agent.safety_cannot_do);
    setEscalation(agent.safety_escalation_path || "");
    setRequiredInts(agent.required_integrations);
  }, [agent]);

  const persist = async (patch: Partial<AIAgent>) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("ai_agents")
        .update(patch as any)
        .eq("id", agent.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (data) onUpdated(normalizeAgentRow(data));
      toast.success("Settings updated");
    } catch (err: any) {
      toast.error("Could not save", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleIntegration = (key: string) => {
    const next = requiredInts.includes(key) ? requiredInts.filter((k) => k !== key) : [...requiredInts, key];
    setRequiredInts(next);
    void persist({ required_integrations: next } as any);
  };

  const addCan = () => {
    if (!newCan.trim()) return;
    const next = [...canDo, newCan.trim()];
    setCanDo(next); setNewCan("");
    void persist({ safety_can_do: next } as any);
  };
  const removeCan = (i: number) => {
    const next = canDo.filter((_, idx) => idx !== i);
    setCanDo(next);
    void persist({ safety_can_do: next } as any);
  };
  const addCannot = () => {
    if (!newCannot.trim()) return;
    const next = [...cannotDo, newCannot.trim()];
    setCannotDo(next); setNewCannot("");
    void persist({ safety_cannot_do: next } as any);
  };
  const removeCannot = (i: number) => {
    const next = cannotDo.filter((_, idx) => idx !== i);
    setCannotDo(next);
    void persist({ safety_cannot_do: next } as any);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SpecCard icon={Workflow} title="Trigger">
        <KV label="Type" value={TRIGGER_TYPE_LABEL[agent.trigger_type]} />
        {agent.trigger_schedule && <KV label="Schedule" value={agent.trigger_schedule} />}
        {agent.trigger_source && <KV label="Source" value={agent.trigger_source} />}
        {agent.trigger_condition && <KV label="Condition" value={agent.trigger_condition} />}
        <p className="text-[11px] text-muted-foreground mt-3">Edit the trigger from the Workflow tab — click the trigger node.</p>
      </SpecCard>

      <SpecCard icon={Plug} title="Required integrations">
        <div className="flex flex-wrap gap-1.5">
          {INTEGRATION_OPTIONS.map((key) => {
            const active = requiredInts.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleIntegration(key)}
                disabled={saving}
                className={cn(
                  "px-2.5 py-1 rounded-full border text-xs capitalize transition-colors",
                  active
                    ? "bg-primary/10 border-primary/60 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {key.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </SpecCard>

      <SpecCard icon={ShieldCheck} title="Safety guardrails" className="md:col-span-2">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">Can do</p>
            <ul className="space-y-1.5 mb-3">
              {canDo.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-1 shrink-0" />
                  <span className="flex-1">{r}</span>
                  <button onClick={() => removeCan(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {canDo.length === 0 && <li className="text-xs text-muted-foreground">No allow rules yet.</li>}
            </ul>
            <div className="flex gap-2">
              <Input value={newCan} onChange={(e) => setNewCan(e.target.value)} placeholder="e.g. Reply to messages in #support"
                onKeyDown={(e) => e.key === "Enter" && addCan()} />
              <Button size="sm" variant="outline" onClick={addCan} disabled={saving}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive mb-2">Cannot do</p>
            <ul className="space-y-1.5 mb-3">
              {cannotDo.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-3.5 w-3.5 text-destructive mt-1 shrink-0" />
                  <span className="flex-1">{r}</span>
                  <button onClick={() => removeCannot(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {cannotDo.length === 0 && <li className="text-xs text-muted-foreground">No block rules yet.</li>}
            </ul>
            <div className="flex gap-2">
              <Input value={newCannot} onChange={(e) => setNewCannot(e.target.value)} placeholder="e.g. Never send external emails"
                onKeyDown={(e) => e.key === "Enter" && addCannot()} />
              <Button size="sm" variant="outline" onClick={addCannot} disabled={saving}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-border/60 space-y-1.5">
          <Label>Escalation path</Label>
          <div className="flex gap-2">
            <Input
              value={escalation}
              onChange={(e) => setEscalation(e.target.value)}
              placeholder="Who or which channel does the agent escalate to?"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={saving || escalation === (agent.safety_escalation_path || "")}
              onClick={() => persist({ safety_escalation_path: escalation || null } as any)}
            >
              Save
            </Button>
          </div>
        </div>
      </SpecCard>

      {supervisorName && (
        <SpecCard icon={UserCog} title="Supervisor" className="md:col-span-2">
          <p className="text-sm">{supervisorName}</p>
        </SpecCard>
      )}
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

function RunRow({ run }: { run: AgentRun }) {
  const [open, setOpen] = useState(false);
  const status = run.status as AgentRunStatus;
  const Icon = RUN_STATUS_ICON[status];
  const output: any = run.output || {};
  const toolCalls: any[] = Array.isArray(output?.tool_calls) ? output.tool_calls : [];
  const stepLog: any[] = Array.isArray(output?.step_log) ? output.step_log : [];
  const summary: string =
    (typeof output?.output === "string" && output.output) ||
    (typeof output?.summary === "string" && output.summary) ||
    "";
  const cleanMessage = run.message && run.message !== "null" ? run.message : "";
  const cleanError = run.error && run.error !== "null" ? run.error : "";
  const hasDetails = !!cleanMessage || !!cleanError || toolCalls.length > 0 || stepLog.length > 0 || !!summary;

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        className={cn("w-full flex items-start gap-3 text-left", hasDetails && "cursor-pointer")}
      >
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", RUN_STATUS_TONE[status], status === "running" && "animate-spin")} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">
            {status} · <span className="font-normal text-muted-foreground">{run.trigger_kind}</span>
            {toolCalls.length > 0 && (
              <span className="font-normal text-muted-foreground"> · {toolCalls.length} action{toolCalls.length !== 1 ? "s" : ""}</span>
            )}
          </p>
          {summary ? (
            <p className="text-xs text-muted-foreground line-clamp-1">{summary}</p>
          ) : cleanMessage ? (
            <p className="text-xs text-muted-foreground line-clamp-1">{cleanMessage}</p>
          ) : null}
          {cleanError && <p className="text-xs text-destructive mt-0.5 line-clamp-1">{cleanError}</p>}
        </div>
        <p className="text-xs text-muted-foreground shrink-0">{new Date(run.started_at).toLocaleString()}</p>
      </button>
      {open && hasDetails && (
        <div className="mt-3 ml-7 space-y-4">
          {summary && (
            <p className="text-sm whitespace-pre-wrap">{summary}</p>
          )}

          {toolCalls.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Actions performed</p>
              <ul className="space-y-2">
                {toolCalls.map((tc, i) => (
                  <ToolCallCard key={i} tc={tc} />
                ))}
              </ul>
            </div>
          )}

          {stepLog.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Steps</p>
              <ol className="space-y-1.5">
                {stepLog.map((s, i) => {
                  const skipped = typeof s.result === "string" && /^N\/A/i.test(s.result);
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      {skipped ? (
                        <div className="h-5 w-5 rounded-full border border-dashed border-border flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-muted-foreground">–</div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium", skipped && "text-muted-foreground")}>{s.label || `Step ${s.step ?? i + 1}`}</p>
                        {s.result && <p className="text-xs text-muted-foreground">{s.result}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {cleanError && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive mb-1">Error</p>
              <p className="text-sm text-destructive whitespace-pre-wrap">{cleanError}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

const TOOL_LOGOS: Record<string, string> = {
  gmail: logoGmail,
  outlook: logoOutlook,
  gcal: logoGcal,
  google_calendar: logoGcal,
  calendar: logoGcal,
  hubspot: logoHubspot,
  slack: logoSlack,
  zoom: logoZoom,
};

function logoFor(name: string): string | null {
  const n = name.toLowerCase();
  for (const key of Object.keys(TOOL_LOGOS)) {
    if (n.startsWith(key)) return TOOL_LOGOS[key];
  }
  return null;
}

function ToolCallCard({ tc }: { tc: any }) {
  const name: string = tc?.tool || tc?.name || "action";
  const args = tc?.args || {};
  const result = tc?.result;
  const ok = result?.ok !== false && !result?.error;
  const { title, detail } = describeToolCall(name, args, result);
  const logo = logoFor(name);

  return (
    <li className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {logo ? (
          <img src={logo} alt="" className="h-5 w-5 object-contain" />
        ) : (
          <Zap className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{title}</p>
          {ok ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
        </div>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </li>
  );
}

function describeToolCall(name: string, args: any, result: any): { title: string; detail?: string } {
  const trim = (s: any, n = 90) => {
    const str = typeof s === "string" ? s : s == null ? "" : String(s);
    return str.length > n ? str.slice(0, n) + "…" : str;
  };
  const n = name.toLowerCase();

  // Gmail
  if (n.includes("gmail") && (n.includes("send"))) {
    return { title: `Sent email to ${args.to || "recipient"}`, detail: args.subject ? `Subject: ${trim(args.subject)}` : undefined };
  }
  if (n.includes("gmail") && n.includes("draft")) {
    return { title: `Drafted email to ${args.to || "recipient"}`, detail: args.subject ? `Subject: ${trim(args.subject)}` : undefined };
  }
  if (n.includes("gmail") && (n.includes("list") || n.includes("search"))) {
    const count = Array.isArray(result?.messages) ? result.messages.length : null;
    return {
      title: `Read inbox${args.query ? ` (${trim(args.query, 40)})` : ""}`,
      detail: count != null ? `Found ${count} message${count !== 1 ? "s" : ""}` : undefined,
    };
  }

  // Outlook
  if (n.includes("outlook") && n.includes("send")) {
    return { title: `Sent Outlook email to ${args.to || "recipient"}`, detail: args.subject ? `Subject: ${trim(args.subject)}` : undefined };
  }
  if (n.includes("outlook") && (n.includes("list") || n.includes("read"))) {
    const count = Array.isArray(result?.messages) ? result.messages.length : null;
    return { title: `Read Outlook inbox`, detail: count != null ? `Found ${count} message${count !== 1 ? "s" : ""}` : undefined };
  }

  // Calendar
  if ((n.includes("gcal") || n.includes("calendar")) && (n.includes("list") || n.includes("get"))) {
    const count = Array.isArray(result?.events) ? result.events.length : null;
    return { title: `Checked calendar`, detail: count != null ? `${count} event${count !== 1 ? "s" : ""}` : undefined };
  }
  if ((n.includes("gcal") || n.includes("calendar")) && n.includes("create")) {
    return { title: `Created event: ${trim(args.summary || "Untitled")}`, detail: args.start ? `Starts ${args.start}` : undefined };
  }

  // HubSpot
  if (n.includes("hubspot") && n.includes("contact") && n.includes("search")) {
    const count = Array.isArray(result?.contacts) ? result.contacts.length : null;
    return { title: `Searched HubSpot contacts`, detail: count != null ? `${count} contact${count !== 1 ? "s" : ""}` : undefined };
  }
  if (n.includes("hubspot") && n.includes("contact") && n.includes("create")) {
    return { title: `Created HubSpot contact${args.email ? `: ${args.email}` : ""}` };
  }
  if (n.includes("hubspot") && n.includes("note")) {
    return { title: `Added HubSpot note`, detail: args.body ? trim(args.body) : undefined };
  }

  // Slack
  if (n.includes("slack") && (n.includes("post") || n.includes("send"))) {
    return { title: `Posted to Slack ${args.channel ? `#${args.channel}` : ""}`.trim(), detail: args.text ? trim(args.text) : undefined };
  }

  // Fallback
  return {
    title: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
