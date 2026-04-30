import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Save, X, Check, Plus, Trash2, Workflow, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * EmployeeDomainLensPanel — surfaces the new strategic-thinker fields on each
 * AI Employee:
 *
 *   • domain_lens     — the filter through which they see EVERY decision
 *                       (e.g., "Every decision through acquisition cost + brand ROI")
 *   • owns[]          — what the employee has authority over
 *   • advises_on[]    — what they provide input on (no authority)
 *   • does_not_touch[]— what they explicitly stay away from
 *   • triggers        — what activates this employee for review/strategy
 *
 * Plus the list of agents this employee supervises (read from ai_agents
 * where supervisor_employee_id = this.id).
 */
export interface EmployeeLensValue {
  domain_lens: string | null;
  owns: string[];
  advises_on: string[];
  does_not_touch: string[];
  triggers: string | null;
}

interface SupervisedAgent {
  id: string;
  name: string;
  status: string;
  trigger_type: string;
}

interface Props {
  employeeId: string;
  initial: EmployeeLensValue;
  onSaved?: (next: EmployeeLensValue) => void;
}

export function EmployeeDomainLensPanel({ employeeId, initial, onSaved }: Props) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domainLens, setDomainLens] = useState(initial.domain_lens ?? "");
  const [owns, setOwns] = useState<string[]>(initial.owns.length ? initial.owns : [""]);
  const [advisesOn, setAdvisesOn] = useState<string[]>(
    initial.advises_on.length ? initial.advises_on : [""],
  );
  const [doesNotTouch, setDoesNotTouch] = useState<string[]>(
    initial.does_not_touch.length ? initial.does_not_touch : [""],
  );
  const [triggers, setTriggers] = useState(initial.triggers ?? "");

  const [agents, setAgents] = useState<SupervisedAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAgents(true);
      const { data } = await supabase
        .from("ai_agents")
        .select("id, name, status, trigger_type")
        .eq("supervisor_employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setAgents((data || []) as SupervisedAgent[]);
        setLoadingAgents(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employeeId]);

  // Reset edit-buffer when caller hands us new initial values.
  useEffect(() => {
    setDomainLens(initial.domain_lens ?? "");
    setOwns(initial.owns.length ? initial.owns : [""]);
    setAdvisesOn(initial.advises_on.length ? initial.advises_on : [""]);
    setDoesNotTouch(initial.does_not_touch.length ? initial.does_not_touch : [""]);
    setTriggers(initial.triggers ?? "");
  }, [initial]);

  const cleanedNext: EmployeeLensValue = useMemo(
    () => ({
      domain_lens: domainLens.trim() || null,
      owns: owns.map((s) => s.trim()).filter(Boolean),
      advises_on: advisesOn.map((s) => s.trim()).filter(Boolean),
      does_not_touch: doesNotTouch.map((s) => s.trim()).filter(Boolean),
      triggers: triggers.trim() || null,
    }),
    [domainLens, owns, advisesOn, doesNotTouch, triggers],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ai_employees")
        .update({
          domain_lens: cleanedNext.domain_lens,
          owns: cleanedNext.owns,
          advises_on: cleanedNext.advises_on,
          does_not_touch: cleanedNext.does_not_touch,
          triggers: cleanedNext.triggers,
        })
        .eq("id", employeeId);
      if (error) throw error;
      toast.success("Domain lens saved");
      setEditing(false);
      onSaved?.(cleanedNext);
    } catch (err: any) {
      toast.error("Could not save", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDomainLens(initial.domain_lens ?? "");
    setOwns(initial.owns.length ? initial.owns : [""]);
    setAdvisesOn(initial.advises_on.length ? initial.advises_on : [""]);
    setDoesNotTouch(initial.does_not_touch.length ? initial.does_not_touch : [""]);
    setTriggers(initial.triggers ?? "");
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Domain lens</h3>
        </div>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* domain_lens */}
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          The filter they see every decision through
        </Label>
        {editing ? (
          <Textarea
            value={domainLens}
            onChange={(e) => setDomainLens(e.target.value)}
            placeholder="e.g. Every decision through acquisition cost + brand ROI"
            rows={2}
          />
        ) : (
          <p className={cn("text-sm", !initial.domain_lens && "text-muted-foreground italic")}>
            {initial.domain_lens || "Not set yet — describe how this employee thinks."}
          </p>
        )}
      </div>

      {/* owns / advises_on / does_not_touch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LensList
          tone="emerald"
          label="Owns (authority)"
          editing={editing}
          values={owns}
          setValues={setOwns}
          displayValues={initial.owns}
          placeholder="e.g. Marketing channels"
        />
        <LensList
          tone="amber"
          label="Advises on (input only)"
          editing={editing}
          values={advisesOn}
          setValues={setAdvisesOn}
          displayValues={initial.advises_on}
          placeholder="e.g. Pricing"
        />
        <LensList
          tone="rose"
          label="Doesn't touch"
          editing={editing}
          values={doesNotTouch}
          setValues={setDoesNotTouch}
          displayValues={initial.does_not_touch}
          placeholder="e.g. Engineering"
        />
      </div>

      {/* triggers */}
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          What activates this employee
        </Label>
        {editing ? (
          <Textarea
            value={triggers}
            onChange={(e) => setTriggers(e.target.value)}
            placeholder="e.g. Weekly campaign performance review, or whenever CAC moves > 10%"
            rows={2}
          />
        ) : (
          <p className={cn("text-sm", !initial.triggers && "text-muted-foreground italic")}>
            {initial.triggers || "Not set yet — when should this employee weigh in?"}
          </p>
        )}
      </div>

      {/* Supervised agents */}
      <div className="pt-4 border-t border-border/60">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" /> Supervises
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate("/app/agents")}
          >
            <Plus className="h-3.5 w-3.5" /> Add agent
          </Button>
        </div>
        {loadingAgents ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ) : agents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No agents reporting to this employee yet. Create one and assign this employee as its supervisor.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {agents.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/40 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{a.name}</span>
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] capitalize",
                    a.status === "active" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    a.status === "paused" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                  )}
                >
                  {a.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LensList({
  tone,
  label,
  editing,
  values,
  setValues,
  displayValues,
  placeholder,
}: {
  tone: "emerald" | "amber" | "rose";
  label: string;
  editing: boolean;
  values: string[];
  setValues: (v: string[]) => void;
  displayValues: string[];
  placeholder: string;
}) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  }[tone];

  if (!editing) {
    return (
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
        {displayValues.length === 0 ? (
          <p className="text-xs text-muted-foreground italic mt-1">Not set</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {displayValues.map((v, i) => (
              <Badge key={i} variant="secondary" className={cn("text-[11px]", toneClass)}>
                {v}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="space-y-1.5 mt-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              value={v}
              onChange={(e) => {
                const copy = [...values];
                copy[i] = e.target.value;
                setValues(copy);
              }}
              placeholder={placeholder}
              className="h-8 text-xs"
            />
            {values.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setValues(values.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setValues([...values, ""])}
        >
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
    </div>
  );
}
