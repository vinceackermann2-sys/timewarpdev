import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

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
  const { getEmployeeLimit } = useSubscription();

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [sopTitle, setSopTitle] = useState("");
  const [purposeWhy, setPurposeWhy] = useState("");
  const [procedure, setProcedure] = useState<string[]>([""]);
  const [procedureContexts, setProcedureContexts] = useState<Record<number, string>>({});
  const [expandedProcedureIdx, setExpandedProcedureIdx] = useState<number | null>(null);
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
      .select("id, title, data_type, workspace_id, content")
      .eq("workspace_id", wsId)
      .eq("source", "business-dna")
      .in("data_type", ["brand", "product", "audience"])
      .order("created_at", { ascending: false });
    setBusinesses((data || []) as BusinessItem[]);
    setLoadingBusinesses(false);
  };

  const getBrandChildren = (brand: BusinessItem) => {
    try {
      const parsed = JSON.parse(brand.content || "{}");
      const brandId = parsed.id || brand.id;
      const products = businesses.filter(b => {
        if (b.data_type !== "product") return false;
        try { return JSON.parse(b.content || "{}").brandId === brandId; } catch { return false; }
      });
      const audiences = businesses.filter(b => {
        if (b.data_type !== "audience") return false;
        try {
          const ac = JSON.parse(b.content || "{}");
          return ac.productIds?.some((pid: string) => products.some(p => {
            try { return JSON.parse(p.content || "{}").id === pid; } catch { return false; }
          }));
        } catch { return false; }
      });
      return { products, audiences };
    } catch { return { products: [], audiences: [] }; }
  };

  const canProceed = () => {
    if (step === 0) return name.trim() && role.trim();
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

    // Check employee limit
    const employeeLimit = getEmployeeLimit();
    if (employeeLimit !== Infinity) {
      const { count, error: countErr } = await supabase
        .from("ai_employees")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id);
      if (!countErr && (count ?? 0) >= employeeLimit) {
        setSaving(false);
        toast({ title: "Employee limit reached", description: `Your plan allows up to ${employeeLimit} employees. Upgrade for more.`, variant: "destructive" });
        return;
      }
    }

    const wsId = selectedWorkspaceId || activeWorkspaceId || null;

    // Build procedure with embedded context
    const procedureWithContext = procedure.filter(p => p.trim()).map((p, i) => {
      const ctx = procedureContexts[i]?.trim();
      return ctx ? `${p} [Context: ${ctx}]` : p;
    });

    const { error } = await supabase.from("ai_employees").insert({
      user_id: session.user.id,
      workspace_id: wsId ? wsId : null,
      name: name.trim(),
      role: role.trim(),
      orb_colors: orbPalettes[0],
      sop_title: sopTitle.trim() || `${role.trim()} Procedure`,
      sop_purpose: purposeWhy.trim() || null,
      sop_procedure: procedureWithContext,
      sop_safety_notes: [safetyWarnings.trim(), safetyRisks.trim()].filter(Boolean).join("\n\n") || null,
      sop_revision_history: [{ version: "1.0", date: new Date().toISOString().split("T")[0], notes: "Initial creation" }],
      linked_business_id: selectedBusinessId,
    });

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
    // Also remove context for that index and re-key
    const newContexts: Record<number, string> = {};
    Object.entries(procedureContexts).forEach(([k, v]) => {
      const ki = parseInt(k);
      if (ki < idx) newContexts[ki] = v;
      else if (ki > idx) newContexts[ki - 1] = v;
    });
    setProcedureContexts(newContexts);
    if (expandedProcedureIdx === idx) setExpandedProcedureIdx(null);
    else if (expandedProcedureIdx !== null && expandedProcedureIdx > idx) setExpandedProcedureIdx(expandedProcedureIdx - 1);
  };

  const STEP_SHORT = ["Identity", "Import", "Procedure", "Safety", "Data"];

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
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. I need a data analyst who analyses our facebook ad metrics" />
            </div>

            <div className="relative flex items-center gap-4 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">OR START FROM TEMPLATE</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={() => {
                setName("Signal Scout");
                setRole("Audience Researcher");
                setSopTitle("Signal Mining Method");
                setPurposeWhy("To gather data-backed product research");
                setProcedure([
                  "Go to reddit.com",
                  "Search up audience-related problems people have with our product",
                  "Find quotes verifying these problems",
                  "Find different audiences that have different problems",
                ]);
                setSafetyWarnings("Don't chat with anyone");
                toast({ title: "Template applied", description: "Signal Mining Method loaded — you can edit any field." });
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group"
            >
              <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary text-sm shrink-0">🔍</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Signal Mining Method</p>
                <p className="text-xs text-muted-foreground">Data-backed research — Reddit audience research</p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
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
              <Label className="text-base font-semibold text-foreground">What are the step-by-step instructions?</Label>
              <p className="text-xs text-muted-foreground">The core procedure this employee will follow, in order. Click the arrow to add context for each step.</p>
              {procedure.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-muted-foreground font-mono mt-2.5 w-6 text-right shrink-0">{i + 1}.</span>
                    <Input value={p} onChange={e => updateListItem(procedure, setProcedure, i, e.target.value)} placeholder={`Step ${i + 1}`} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedProcedureIdx(expandedProcedureIdx === i ? null : i)}
                      className="shrink-0"
                      title="Add context"
                    >
                      {expandedProcedureIdx === i ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                    {procedure.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeListItem(procedure, setProcedure, i)}><X className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {expandedProcedureIdx === i && (
                    <div className="ml-8 mr-16 animate-fade-in">
                      <Textarea
                        value={procedureContexts[i] || ""}
                        onChange={e => setProcedureContexts(prev => ({ ...prev, [i]: e.target.value }))}
                        placeholder="Add additional context, notes, or details for this step..."
                        className="text-xs min-h-[60px]"
                      />
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addListItem(procedure, setProcedure)} className="gap-1">
                <Plus className="h-3 w-3" /> Add Step
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
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

        {step === 4 && (
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
                <p className="text-xs text-muted-foreground">Select a business and the specific data it should use.</p>
                {loadingBusinesses ? (
                  <div className="space-y-3 py-2">
                    {[1, 2].map(i => (
                      <div key={i} className="rounded-lg border border-border p-3 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                          <Skeleton className="h-4 w-4 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : businesses.filter(b => b.data_type === "brand").length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4">No businesses in this workspace. Add a brand in Business DNA first.</p>
                ) : (
                  <div className="max-h-64 overflow-auto space-y-2">
                    {businesses.filter(b => b.data_type === "brand").map(brand => {
                      const { products: brandProducts, audiences: brandAudiences } = getBrandChildren(brand);
                      const isExpanded = expandedBrandId === brand.id;
                      const isBrandSelected = selectedBusinessId === brand.id;
                      const hasChildren = brandProducts.length > 0 || brandAudiences.length > 0;

                      return (
                        <div key={brand.id} className="rounded-lg border border-border overflow-hidden animate-fade-in">
                          <button
                            onClick={() => {
                              setSelectedBusinessId(isBrandSelected ? null : brand.id);
                              setExpandedBrandId(isExpanded ? null : brand.id);
                            }}
                            className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                              isBrandSelected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                            }`}
                          >
                            <span className="text-lg">🏷️</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{brand.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {brandProducts.length} product{brandProducts.length !== 1 ? "s" : ""} · {brandAudiences.length} audience{brandAudiences.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            {hasChildren && (
                              isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            {isBrandSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </button>

                          {isExpanded && hasChildren && (
                            <div className="border-t border-border bg-muted/30 px-3 py-2 space-y-1.5 animate-fade-in">
                              {brandProducts.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Products</p>
                                  {brandProducts.map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => setSelectedBusinessId(selectedBusinessId === p.id ? null : p.id)}
                                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-all text-sm ${
                                        selectedBusinessId === p.id
                                          ? "bg-primary/10 border border-primary/30"
                                          : "hover:bg-muted/80 border border-transparent"
                                      }`}
                                    >
                                      <span className="text-sm">📦</span>
                                      <span className="flex-1 truncate">{p.title}</span>
                                      {selectedBusinessId === p.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {brandAudiences.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Audiences</p>
                                  {brandAudiences.map(a => (
                                    <button
                                      key={a.id}
                                      onClick={() => setSelectedBusinessId(selectedBusinessId === a.id ? null : a.id)}
                                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-all text-sm ${
                                        selectedBusinessId === a.id
                                          ? "bg-primary/10 border border-primary/30"
                                          : "hover:bg-muted/80 border border-transparent"
                                      }`}
                                    >
                                      <span className="text-sm">👥</span>
                                      <span className="flex-1 truncate">{a.title}</span>
                                      {selectedBusinessId === a.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
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
