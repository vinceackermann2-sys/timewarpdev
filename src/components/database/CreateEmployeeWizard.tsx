import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { FileUploadZone } from "@/components/database/FileUploadZone";
import { ArrowLeft, ArrowRight, Check, Plus, X, Loader2, PenLine, Database, Building2, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  onCancel: () => void;
  onCreated: () => void;
  orbPalettes: { c1: string; c2: string; c3: string }[];
}

const STEPS = [
  "Identity",
  "Import SOP",
  "Title & Purpose",
  "Scope",
  "Definitions",
  "Procedure",
  "Safety",
  "Business Data",
];

interface BusinessItem {
  id: string;
  title: string;
  data_type: string;
  workspace_id: string | null;
  content?: string | null;
}

export function CreateEmployeeWizard({ onCancel, onCreated, orbPalettes }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { activeWorkspaceId, workspaces } = useWorkspace();
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [sopTitle, setSopTitle] = useState("");
  const [purposeWhy, setPurposeWhy] = useState("");
  const [purposeProblem, setPurposeProblem] = useState("");
  const [scopeWhere, setScopeWhere] = useState("");
  const [scopeWhen, setScopeWhen] = useState("");
  const [definitions, setDefinitions] = useState<{ term: string; meaning: string }[]>([]);
  const [procedure, setProcedure] = useState<string[]>([""]);
  const [safetyWarnings, setSafetyWarnings] = useState("");
  const [safetyRisks, setSafetyRisks] = useState("");
  const [fileUploaded, setFileUploaded] = useState(false);

  // Business data step
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(activeWorkspaceId || "");
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);

  // Load businesses when workspace changes on the last step
  useEffect(() => {
    if (step === STEPS.length - 1 && selectedWorkspaceId) {
      loadBusinesses(selectedWorkspaceId);
    }
  }, [step, selectedWorkspaceId]);

  const loadBusinesses = async (wsId: string) => {
    setLoadingBusinesses(true);
    const { data } = await supabase
      .from("user_business_data")
      .select("id, title, data_type, workspace_id, source")
      .eq("workspace_id", wsId)
      .eq("source", "business-dna")
      .in("data_type", ["brand", "product", "audience"])
      .order("data_type", { ascending: true })
      .order("created_at", { ascending: false });
    setBusinesses((data || []).map(d => ({ ...d, source: (d as any).source })) as BusinessItem[]);
    setLoadingBusinesses(false);
  };

  const canProceed = () => {
    if (step === 0) return name.trim() && role.trim();
    if (step === 2) return sopTitle.trim();
    return true;
  };

  const handleFileUploaded = (file: { summary: string }) => {
    setFileUploaded(true);
    if (file.summary && !purposeWhy) {
      setPurposeWhy(file.summary);
    }
    toast({ title: "SOP file imported", description: "You can review and edit the details in the following steps." });
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setSaving(false); return; }

    const { error } = await supabase.from("ai_employees" as any).insert({
      user_id: session.user.id,
      workspace_id: selectedWorkspaceId || activeWorkspaceId,
      name: name.trim(),
      role: role.trim(),
      orb_colors: orbPalettes[0],
      sop_title: sopTitle.trim() || null,
      sop_purpose: [purposeWhy.trim(), purposeProblem.trim()].filter(Boolean).join("\n\n") || null,
      sop_scope: [scopeWhere.trim(), scopeWhen.trim()].filter(Boolean).join("\n\n") || null,
      sop_definitions: definitions.filter(d => d.term.trim()),
      sop_procedure: procedure.filter(p => p.trim()),
      sop_safety_notes: [safetyWarnings.trim(), safetyRisks.trim()].filter(Boolean).join("\n\n") || null,
      sop_revision_history: [{ version: "1.0", date: new Date().toISOString().split("T")[0], notes: "Initial creation" }],
      linked_business_id: selectedBusinessId,
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

  const STEP_SHORT = ["Identity", "Import", "Title", "Scope", "Definitions", "Procedure", "Safety", "Data"];

  const dataTypeIcon = (type: string) => {
    if (type === "brand") return "🏷️";
    if (type === "product") return "📦";
    if (type === "audience") return "👥";
    return "📄";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Top: Stepper bar */}
      <div className="p-4 border-b border-border flex justify-center">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEP_SHORT.map((label, i) => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <button
                key={i}
                onClick={() => { if (i < step) setStep(i); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shrink-0 ${
                  isActive ? "bg-primary/10 border border-primary/30" : "border border-transparent"
                } ${i < step ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                        ? "bg-primary/80 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto w-full flex flex-col justify-center">
        {step === 0 && (
          <div className="space-y-8">
            <div className="flex flex-col items-center gap-4 mb-2">
              <BusinessBrainOrb size={72} />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">What should this employee be called?</Label>
              <p className="text-xs text-muted-foreground">Give your AI employee a name.</p>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">What role will they perform?</Label>
              <p className="text-xs text-muted-foreground">Describe the position or function.</p>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Customer Support Agent" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2 mb-4">
              <h3 className="text-lg font-semibold text-foreground">Import or build your SOP</h3>
              <p className="text-sm text-muted-foreground">Upload an existing SOP document, or continue to fill in the details manually.</p>
            </div>
            <FileUploadZone onFileUploaded={handleFileUploaded} />
            {!fileUploaded && (
              <div className="relative flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <Button variant="outline" className="w-full gap-2 h-12" onClick={() => setStep(2)}>
              <PenLine className="h-4 w-4" />
              {fileUploaded ? "Review & edit SOP details" : "Fill in manually"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">What is the title of this procedure?</Label>
              <p className="text-xs text-muted-foreground">The name of the procedure this employee follows.</p>
              <Input value={sopTitle} onChange={e => setSopTitle(e.target.value)} placeholder="e.g. Customer Complaint Handling Procedure" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Why does this procedure exist?</Label>
              <Input value={purposeWhy} onChange={e => setPurposeWhy(e.target.value)} placeholder="e.g. To ensure consistent handling of customer complaints" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">What problem does it solve?</Label>
              <Input value={purposeProblem} onChange={e => setPurposeProblem(e.target.value)} placeholder="e.g. Reduces response time and improves customer satisfaction" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Where does this procedure apply?</Label>
              <Input value={scopeWhere} onChange={e => setScopeWhere(e.target.value)} placeholder="e.g. All customer-facing departments" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">When does this procedure apply?</Label>
              <Input value={scopeWhen} onChange={e => setScopeWhen(e.target.value)} placeholder="e.g. Whenever a complaint is received" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Are there any terms or abbreviations to define?</Label>
              <p className="text-xs text-muted-foreground">Technical terms or abbreviations used in this procedure (optional).</p>
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
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">What are the step-by-step instructions?</Label>
              <p className="text-xs text-muted-foreground">The core procedure this employee will follow, in order.</p>
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

        {step === 6 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Any safety warnings or regulations?</Label>
              <Input value={safetyWarnings} onChange={e => setSafetyWarnings(e.target.value)} placeholder="e.g. Must comply with GDPR data handling" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Any risk considerations?</Label>
              <Input value={safetyRisks} onChange={e => setSafetyRisks(e.target.value)} placeholder="e.g. Escalation required for legal threats" />
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-8">
            <div className="text-center space-y-2 mb-2">
              <Database className="h-10 w-10 mx-auto text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Link business data</h3>
              <p className="text-sm text-muted-foreground">Select the workspace and business this employee will use when executing the SOP.</p>
            </div>

            {/* Workspace selector */}
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Which workspace?</Label>
              <div className="grid grid-cols-1 gap-2">
                {workspaces.map(ws => (
                  <button
                    key={ws.workspaceId}
                    onClick={() => {
                      setSelectedWorkspaceId(ws.workspaceId);
                      setSelectedBusinessId(null);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      selectedWorkspaceId === ws.workspaceId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ws.workspaceName}</p>
                      <p className="text-xs text-muted-foreground">{ws.memberCount} member{ws.memberCount !== 1 ? "s" : ""} · {ws.role}</p>
                    </div>
                    {selectedWorkspaceId === ws.workspaceId && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Business selector */}
            {selectedWorkspaceId && (
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Which business data should it query?</Label>
                <p className="text-xs text-muted-foreground">Select a brand, product, or audience from your Business DNA.</p>
                {loadingBusinesses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                  </div>
                ) : businesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4">No Business DNA data in this workspace. Add brands, products, or audiences first.</p>
                ) : (
                  <div className="max-h-56 overflow-auto space-y-4">
                    {(["brand", "product", "audience"] as const).map(dtype => {
                      const items = businesses.filter(b => b.data_type === dtype);
                      if (items.length === 0) return null;
                      return (
                        <div key={dtype}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            {dtype === "brand" ? "🏷️ Brands" : dtype === "product" ? "📦 Products" : "👥 Audiences"}
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {items.map(b => (
                              <button
                                key={b.id}
                                onClick={() => setSelectedBusinessId(selectedBusinessId === b.id ? null : b.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                  selectedBusinessId === b.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-border/80"
                                }`}
                              >
                                <span className="text-base">{dataTypeIcon(b.data_type)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{b.title}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{b.data_type}</p>
                                </div>
                                {selectedBusinessId === b.id && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-border p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : onCancel()}>
            {step > 0 ? <><ArrowLeft className="h-4 w-4 mr-1" /> Back</> : "Cancel"}
          </Button>
          {step < STEPS.length - 1 ? (
            step === 1 ? (
              <Button onClick={() => setStep(2)} className="gap-1">
                Skip <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )
          ) : (
            <Button onClick={handleSave} disabled={saving || !canProceed()} className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create Employee
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
