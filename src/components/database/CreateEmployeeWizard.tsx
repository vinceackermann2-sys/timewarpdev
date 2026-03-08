import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { ArrowLeft, ArrowRight, Check, Plus, X, Loader2 } from "lucide-react";

interface Props {
  onCancel: () => void;
  onCreated: () => void;
  orbPalettes: { c1: string; c2: string; c3: string }[];
}

const STEPS = [
  "Identity",
  "Title & Purpose",
  "Scope & Responsibilities",
  "Definitions & Materials",
  "Procedure",
  "Safety & Documentation",
];

export function CreateEmployeeWizard({ onCancel, onCreated, orbPalettes }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { activeWorkspaceId } = useWorkspace();
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [sopTitle, setSopTitle] = useState("");
  const [sopPurpose, setSopPurpose] = useState("");
  const [sopScope, setSopScope] = useState("");
  const [responsibilities, setResponsibilities] = useState<string[]>([""]);
  const [definitions, setDefinitions] = useState<{ term: string; meaning: string }[]>([]);
  const [materials, setMaterials] = useState<string[]>([""]);
  const [procedure, setProcedure] = useState<string[]>([""]);
  const [safetyNotes, setSafetyNotes] = useState("");
  const [documentation, setDocumentation] = useState("");

  const canProceed = () => {
    if (step === 0) return name.trim() && role.trim();
    if (step === 1) return sopTitle.trim();
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setSaving(false); return; }

    const { error } = await supabase.from("ai_employees" as any).insert({
      user_id: session.user.id,
      workspace_id: activeWorkspaceId,
      name: name.trim(),
      role: role.trim(),
      orb_colors: orbPalettes[selectedPalette],
      sop_title: sopTitle.trim() || null,
      sop_purpose: sopPurpose.trim() || null,
      sop_scope: sopScope.trim() || null,
      sop_responsibilities: responsibilities.filter(r => r.trim()),
      sop_definitions: definitions.filter(d => d.term.trim()),
      sop_materials: materials.filter(m => m.trim()),
      sop_procedure: procedure.filter(p => p.trim()),
      sop_safety_notes: safetyNotes.trim() || null,
      sop_documentation: documentation.trim() || null,
      sop_revision_history: [{ version: "1.0", date: new Date().toISOString().split("T")[0], notes: "Initial creation" }],
    } as any);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Employee created", description: `${name} has been added.` });
      onCreated();
    }
  };

  const addListItem = (list: string[], setter: (v: string[]) => void) => setter([...list, ""]);
  const updateListItem = (list: string[], setter: (v: string[]) => void, idx: number, val: string) => {
    const copy = [...list];
    copy[idx] = val;
    setter(copy);
  };
  const removeListItem = (list: string[], setter: (v: string[]) => void, idx: number) => {
    setter(list.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold">New AI Employee</h2>
          <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1 px-4 pt-3">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto w-full">
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 mb-2">
              <BusinessBrainOrb size={72} />
            </div>
            <div className="space-y-2">
              <Label>Employee Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Customer Support Agent" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>SOP Title *</Label>
              <Input value={sopTitle} onChange={e => setSopTitle(e.target.value)} placeholder="e.g. Customer Complaint Handling Procedure" />
              <p className="text-xs text-muted-foreground">The name of the procedure this employee follows.</p>
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea value={sopPurpose} onChange={e => setSopPurpose(e.target.value)} placeholder="Why does this SOP exist? What problem does it solve?" rows={4} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Textarea value={sopScope} onChange={e => setSopScope(e.target.value)} placeholder="Where and when does this SOP apply? Which department, team, or process?" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Responsibilities</Label>
              <p className="text-xs text-muted-foreground mb-2">Who is responsible for each part of the process?</p>
              {responsibilities.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={r} onChange={e => updateListItem(responsibilities, setResponsibilities, i, e.target.value)} placeholder={`Responsibility ${i + 1}`} />
                  {responsibilities.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeListItem(responsibilities, setResponsibilities, i)}><X className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addListItem(responsibilities, setResponsibilities)} className="gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Definitions (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Technical terms or abbreviations used.</p>
              {definitions.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={d.term} onChange={e => { const c = [...definitions]; c[i] = { ...c[i], term: e.target.value }; setDefinitions(c); }} placeholder="Term" className="w-1/3" />
                  <Input value={d.meaning} onChange={e => { const c = [...definitions]; c[i] = { ...c[i], meaning: e.target.value }; setDefinitions(c); }} placeholder="Meaning" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setDefinitions(definitions.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setDefinitions([...definitions, { term: "", meaning: "" }])} className="gap-1">
                <Plus className="h-3 w-3" /> Add Definition
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Required Materials / Tools</Label>
              <p className="text-xs text-muted-foreground mb-2">Equipment, software, or documents needed.</p>
              {materials.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={m} onChange={e => updateListItem(materials, setMaterials, i, e.target.value)} placeholder={`Material ${i + 1}`} />
                  {materials.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeListItem(materials, setMaterials, i)}><X className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addListItem(materials, setMaterials)} className="gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Procedure (Core Section)</Label>
              <p className="text-xs text-muted-foreground mb-2">Step-by-step instructions the employee will follow.</p>
              {procedure.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-muted-foreground font-mono mt-2.5 w-6 text-right shrink-0">{i + 1}.</span>
                  <Input value={p} onChange={e => updateListItem(procedure, setProcedure, i, e.target.value)} placeholder={`Step ${i + 1}`} />
                  {procedure.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeListItem(procedure, setProcedure, i)}><X className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addListItem(procedure, setProcedure)} className="gap-1">
                <Plus className="h-3 w-3" /> Add Step
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Safety / Compliance Notes</Label>
              <Textarea value={safetyNotes} onChange={e => setSafetyNotes(e.target.value)} placeholder="Warnings, regulations, or risk considerations." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Documentation / Records</Label>
              <Textarea value={documentation} onChange={e => setDocumentation(e.target.value)} placeholder="What records must be kept and where." rows={3} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : onCancel()}>
          {step > 0 ? <><ArrowLeft className="h-4 w-4 mr-1" /> Back</> : "Cancel"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gap-1">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !canProceed()} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Create Employee
          </Button>
        )}
      </div>
    </div>
  );
}
