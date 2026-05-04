import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Plug,
  ShieldCheck,
  Workflow,
  X,
  Zap,
  AlertTriangle,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import {
  AgentExecutionMode,
  AgentSopStep,
  AgentTriggerType,
  TRIGGER_TYPE_LABEL,
} from "./types";

interface Props {
  onCancel: () => void;
  onCreated: (agentId: string) => void;
}

const STEPS = [
  { key: "trigger", label: "Trigger", icon: Zap },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "sop", label: "SOP", icon: Workflow },
  { key: "safety", label: "Safety", icon: ShieldCheck },
  { key: "supervisor", label: "Supervisor", icon: UserCog },
] as const;

const KNOWN_INTEGRATIONS = [
  { id: "google_gmail", label: "Gmail" },
  { id: "google_calendar", label: "Google Calendar" },
  { id: "google_drive", label: "Google Drive" },
  { id: "google_docs", label: "Google Docs" },
  { id: "google_sheets", label: "Google Sheets" },
  { id: "google_slides", label: "Google Slides" },
  { id: "microsoft_outlook", label: "Microsoft Outlook" },
  { id: "microsoft_onedrive", label: "Microsoft OneDrive" },
  { id: "microsoft_onenote", label: "Microsoft OneNote" },
  { id: "microsoft_teams", label: "Microsoft Teams" },
  { id: "slack", label: "Slack" },
  { id: "zoom", label: "Zoom" },
  { id: "hubspot", label: "HubSpot" },
  { id: "stripe", label: "Stripe" },
];

interface EmployeeOption {
  id: string;
  name: string;
  role: string;
}

/**
 * CreateAgentWizard — 5-step deterministic flow to spec out a new Agent:
 *  1. TRIGGER       — type + source/condition/schedule
 *  2. INTEGRATIONS  — required providers (with live "is connected?" check)
 *  3. SOP           — atomic, testable steps + expected output
 *  4. SAFETY        — can_do / cannot_do / escalation_path
 *  5. SUPERVISOR    — link to an Employee that owns the broader domain
 */
export function CreateAgentWizard({ onCancel, onCreated }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Identity + trigger
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [executionMode, setExecutionMode] = useState<AgentExecutionMode>("api");
  const [triggerType, setTriggerType] = useState<AgentTriggerType>("manual");
  const [triggerSource, setTriggerSource] = useState("");
  const [triggerCondition, setTriggerCondition] = useState("");
  const [triggerSchedule, setTriggerSchedule] = useState("");

  // Step 2: Integrations
  const [requiredIntegrations, setRequiredIntegrations] = useState<string[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [checkingConnections, setCheckingConnections] = useState(false);

  // Step 3: SOP
  const [sopSteps, setSopSteps] = useState<AgentSopStep[]>([{ label: "" }]);
  const [sopOutput, setSopOutput] = useState("");

  // Step 4: Safety
  const [canDo, setCanDo] = useState<string[]>([""]);
  const [cantDo, setCantDo] = useState<string[]>([""]);
  const [escalationPath, setEscalationPath] = useState("");

  // Step 5: Supervisor
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Load connected providers when entering the integrations step.
  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    (async () => {
      setCheckingConnections(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ action: "check-status" }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setConnectedProviders((data.connected || []).map((c: any) => c.provider));
          }
        }
      } catch {
        // best-effort — fall back to "we don't know"
      }
      if (!cancelled) setCheckingConnections(false);
    })();
    return () => { cancelled = true; };
  }, [step]);

  // Load employees when entering the supervisor step.
  useEffect(() => {
    if (step !== 4 || !user) return;
    let cancelled = false;
    (async () => {
      setLoadingEmployees(true);
      let q = supabase.from("ai_employees").select("id, name, role").order("created_at", { ascending: false });
      if (activeWorkspaceId) q = q.eq("workspace_id", activeWorkspaceId);
      else q = q.eq("user_id", user.id);
      const { data } = await q;
      if (!cancelled) {
        setEmployees((data || []) as EmployeeOption[]);
        setLoadingEmployees(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, user, activeWorkspaceId]);

  const stepValid = useMemo(() => {
    if (step === 0) {
      if (!name.trim()) return false;
      if (triggerType === "event" || triggerType === "threshold") {
        return Boolean(triggerSource.trim() && triggerCondition.trim());
      }
      if (triggerType === "schedule") return Boolean(triggerSchedule.trim());
      return true;
    }
    if (step === 1) return true; // integrations are optional
    if (step === 2) return sopSteps.some((s) => s.label.trim().length > 0);
    if (step === 3) return true;
    if (step === 4) return true; // supervisor optional, can be assigned later
    return true;
  }, [step, name, triggerType, triggerSource, triggerCondition, triggerSchedule, sopSteps]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const toggleIntegration = (id: string) => {
    setRequiredIntegrations((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const cleanedSteps = sopSteps
        .map((s) => ({ label: s.label.trim(), detail: s.detail?.trim() || undefined }))
        .filter((s) => s.label.length > 0);
      const cleanedCanDo = canDo.map((s) => s.trim()).filter(Boolean);
      const cleanedCantDo = cantDo.map((s) => s.trim()).filter(Boolean);

      const status = supervisorId ? "active" : "draft";

      const { data, error } = await supabase
        .from("ai_agents")
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspaceId || null,
          supervisor_employee_id: supervisorId,
          name: name.trim(),
          description: description.trim() || null,
          status,
          trigger_type: triggerType,
          trigger_source: triggerSource.trim() || null,
          trigger_condition: triggerCondition.trim() || null,
          trigger_schedule: triggerSchedule.trim() || null,
          required_integrations: requiredIntegrations,
          sop_steps: cleanedSteps,
          sop_output: sopOutput.trim() || null,
          safety_can_do: cleanedCanDo,
          safety_cannot_do: cleanedCantDo,
          safety_escalation_path: escalationPath.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast({ title: "Agent created", description: status === "draft" ? "Saved as draft — assign a supervisor to activate." : "Agent is now active." });
      onCreated(data.id);
    } catch (err: any) {
      toast({ title: "Failed to create agent", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header + progress */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to agents
            </button>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <StepIcon className="h-6 w-6 text-primary" />
              New Agent — {STEPS[step].label}
            </h1>
          </div>
          <div className="text-sm text-muted-foreground shrink-0">
            Step {step + 1} of {STEPS.length}
          </div>
        </div>
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {/* STEP 1 — Trigger */}
        {step === 0 && (
          <div className="space-y-5">
            <SectionCard title="Identity">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Agent name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Slack Product Feedback Monitor"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="One sentence: what does this agent do?"
                    rows={2}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Trigger">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Trigger type</Label>
                  <Select value={triggerType} onValueChange={(v) => setTriggerType(v as AgentTriggerType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TRIGGER_TYPE_LABEL) as AgentTriggerType[]).map((t) => (
                        <SelectItem key={t} value={t}>{TRIGGER_TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(triggerType === "event" || triggerType === "threshold") && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Source</Label>
                      <Input
                        value={triggerSource}
                        onChange={(e) => setTriggerSource(e.target.value)}
                        placeholder={triggerType === "event" ? "e.g. slack" : "e.g. stripe"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Condition</Label>
                      <Input
                        value={triggerCondition}
                        onChange={(e) => setTriggerCondition(e.target.value)}
                        placeholder={
                          triggerType === "event"
                            ? "e.g. new message in #product-feedback"
                            : "e.g. MRR drops > 5% week-over-week"
                        }
                      />
                    </div>
                  </>
                )}

                {triggerType === "schedule" && (
                  <div className="space-y-1.5">
                    <Label>Schedule</Label>
                    <Input
                      value={triggerSchedule}
                      onChange={(e) => setTriggerSchedule(e.target.value)}
                      placeholder="e.g. daily at 9am"
                    />
                  </div>
                )}

                {triggerType === "manual" && (
                  <p className="text-xs text-muted-foreground">
                    A manual agent only runs when you click "Run now" — useful for one-off automations or while you're testing.
                  </p>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* STEP 2 — Integrations */}
        {step === 1 && (
          <SectionCard title="Required integrations" subtitle="Pick the providers this agent must read from. We'll warn you if any aren't connected yet.">
            {checkingConnections ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {KNOWN_INTEGRATIONS.map((p) => {
                  const selected = requiredIntegrations.includes(p.id);
                  const connected = connectedProviders.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleIntegration(p.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 p-3 rounded-lg border text-left text-sm transition-colors",
                        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        <span className="truncate">{p.label}</span>
                      </span>
                      {connected ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Connected
                        </Badge>
                      ) : selected ? (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Not connected
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            {requiredIntegrations.some((id) => !connectedProviders.includes(id)) && !checkingConnections && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-0.5">Some integrations aren't connected yet.</p>
                  <p>
                    The agent will save fine, but won't be able to run until you connect them.{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/app/connections")}
                      className="underline font-medium"
                    >
                      Open Connectors →
                    </button>
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* STEP 3 — SOP */}
        {step === 2 && (
          <SectionCard title="Standard Operating Procedure" subtitle="Atomic, testable steps. No ambiguity — the agent will follow these exactly, in order.">
            <div className="space-y-3">
              {sopSteps.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">{i + 1}</div>
                  <div className="flex-1 space-y-1">
                    <Input
                      value={s.label}
                      onChange={(e) => {
                        const copy = [...sopSteps];
                        copy[i] = { ...copy[i], label: e.target.value };
                        setSopSteps(copy);
                      }}
                      placeholder="e.g. Read incoming message from #product-feedback"
                    />
                    <Textarea
                      value={s.detail || ""}
                      onChange={(e) => {
                        const copy = [...sopSteps];
                        copy[i] = { ...copy[i], detail: e.target.value };
                        setSopSteps(copy);
                      }}
                      placeholder="Optional detail / acceptance criteria"
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                  {sopSteps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 mt-0.5"
                      onClick={() => setSopSteps(sopSteps.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setSopSteps([...sopSteps, { label: "" }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add step
              </Button>
            </div>
            <div className="mt-5 space-y-1.5">
              <Label>Expected output</Label>
              <Textarea
                value={sopOutput}
                onChange={(e) => setSopOutput(e.target.value)}
                placeholder="e.g. Post a daily digest to #product-digest at 5pm with counts and top P1s."
                rows={2}
              />
            </div>
          </SectionCard>
        )}

        {/* STEP 4 — Safety */}
        {step === 3 && (
          <div className="space-y-5">
            <SectionCard title="Can-do" subtitle="Explicit allow-list. The agent may only do things on this list.">
              <ListEditor
                items={canDo}
                setItems={setCanDo}
                placeholder="e.g. Read messages, classify, tag, post digest"
              />
            </SectionCard>
            <SectionCard title="Cannot-do" subtitle="Hard deny-list. The agent must never do these — full stop.">
              <ListEditor
                items={cantDo}
                setItems={setCantDo}
                placeholder="e.g. Delete messages, respond to users, modify channel settings"
              />
            </SectionCard>
            <SectionCard title="Escalation path" subtitle="What should happen when the agent encounters something outside its scope?">
              <Textarea
                value={escalationPath}
                onChange={(e) => setEscalationPath(e.target.value)}
                placeholder="e.g. If a P1 bug is detected → DM the Head of Product immediately."
                rows={3}
              />
            </SectionCard>
          </div>
        )}

        {/* STEP 5 — Supervisor */}
        {step === 4 && (
          <SectionCard
            title="Supervising employee"
            subtitle="Every agent reports to one Employee that owns the broader strategic domain. Pick one, or leave unassigned and assign later."
          >
            {loadingEmployees ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : employees.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  You don't have any employees yet.  You can save this agent as a draft and assign a supervisor later.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate("/app/employees")}>
                  Go to Employees →
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSupervisorId(supervisorId === emp.id ? null : emp.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
                      supervisorId === emp.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                    </div>
                    {supervisorId === emp.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="ghost" onClick={step === 0 ? onCancel : prev} disabled={saving}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!stepValid || saving}>
              Next <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={!stepValid || saving} className="min-w-32">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create agent"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <h3 className="font-semibold text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="h-3" />}
      {children}
    </div>
  );
}

function ListEditor({
  items,
  setItems,
  placeholder,
}: {
  items: string[];
  setItems: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => {
              const copy = [...items];
              copy[i] = e.target.value;
              setItems(copy);
            }}
            placeholder={placeholder}
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setItems([...items, ""])}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}
