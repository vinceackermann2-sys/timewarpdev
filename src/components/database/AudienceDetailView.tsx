import { useState } from "react";
import {
  Users, Pencil, Save, X, ArrowLeft, Plus, Trash2, Lock,
  Check, ChevronDown, ChevronUp, Sparkles, Heart, Crosshair,
  MessageSquareWarning, Languages, ListChecks, Search, Zap,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AudiencePageSidebar } from "@/components/database/AudiencePageSidebar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";

/* ── Types ── */
export interface AudienceData {
  id: string;
  name: string;
  description: string;
  buyingTriggers: string[];
  useCaseRequirements: string[];
  keySuccessIndicators: string[];
  additionalCharacteristics: string;
  positioningStatement: string;
  valuePropositions: string[];
  engagementTriggers: string[];
  attentionHooks: string[];
  commonObjections: { objection: string; response: string }[];
  proofPoints: { category: string; items: string[] }[];
  dosAndDonts: { dos: string[]; donts: string[] };
  powerPhrases: string[];
  powerWords: string[];
  technicalLevel: string;
  refinementChecklist: string[];
  lastUpdated: string;
}

export const DEFAULT_AUDIENCE: AudienceData = {
  id: "",
  name: "My Audience",
  description: "",
  buyingTriggers: [],
  useCaseRequirements: [],
  keySuccessIndicators: [],
  additionalCharacteristics: "",
  positioningStatement: "",
  valuePropositions: [],
  engagementTriggers: [],
  attentionHooks: [],
  commonObjections: [],
  proofPoints: [],
  dosAndDonts: {
    dos: [],
    donts: [],
  },
  powerPhrases: [],
  powerWords: [],
  technicalLevel: "",
  refinementChecklist: [],
  lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
};

/* ── Section heading ── */
function SectionHeading({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} className="pt-2">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ── Bullet list ── */
function BulletList({ items, icon, iconClass, isEditing, onChange }: {
  items: string[]; icon: React.ElementType; iconClass: string; isEditing: boolean; onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-2.5 mt-3">
      {items.map((item, i) => {
        const Icon = icon;
        return (
          <div key={i} className="flex items-start gap-2.5">
            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconClass)} />
            {isEditing ? (
              <div className="flex-1 flex gap-1.5">
                <Input value={item} onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }} className="h-8 text-sm flex-1" />
                <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="h-3 w-3" /></button>
              </div>
            ) : (
              <span className="text-sm text-foreground/80 leading-relaxed">{item}</span>
            )}
          </div>
        );
      })}
      {isEditing && (
        <button onClick={() => onChange([...items, ""])} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors ml-6"><Plus className="h-3 w-3" /> Add item</button>
      )}
    </div>
  );
}

/* ── Main ── */
export function AudienceDetailView({
  audience,
  onBack,
  onSave,
}: {
  audience: AudienceData;
  onBack: () => void;
  onSave: (audience: AudienceData) => void;
}) {
  const { userName } = useBusinessDNA();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);
  const toSafeString = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (typeof obj.action === "string") return obj.action;
      if (typeof obj.emotional_response === "string") return obj.emotional_response;
      if (typeof obj.content_type === "string") return obj.content_type;
    }
    return "";
  };
  const toStringArray = (value: unknown): string[] =>
    toArray<unknown>(value).map(toSafeString).filter(Boolean);

  const safeAudience: AudienceData = {
    ...DEFAULT_AUDIENCE,
    ...audience,
    buyingTriggers: toStringArray(audience.buyingTriggers),
    useCaseRequirements: toStringArray(audience.useCaseRequirements),
    keySuccessIndicators: toStringArray(audience.keySuccessIndicators),
    additionalCharacteristics: toSafeString(audience.additionalCharacteristics),
    positioningStatement: toSafeString(audience.positioningStatement),
    valuePropositions: toStringArray(audience.valuePropositions),
    engagementTriggers: toStringArray(audience.engagementTriggers),
    attentionHooks: toStringArray(audience.attentionHooks),
    commonObjections: toArray<any>(audience.commonObjections).map(o => ({
      objection: toSafeString(o?.objection),
      response: toSafeString(o?.response),
    })),
    proofPoints: toArray<any>(audience.proofPoints).map(pp => ({
      category: toSafeString(pp?.category) || "General",
      items: toStringArray(pp?.items),
    })),
    dosAndDonts: {
      dos: toStringArray(audience.dosAndDonts?.dos),
      donts: toStringArray(audience.dosAndDonts?.donts),
    },
    powerPhrases: toStringArray(audience.powerPhrases),
    powerWords: toStringArray(audience.powerWords),
    technicalLevel: toSafeString(audience.technicalLevel),
    refinementChecklist: toStringArray(audience.refinementChecklist),
  };
  const [data, setData] = useState<AudienceData>(safeAudience);
  const [descExpanded, setDescExpanded] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState("audience-overview");

  const isEditingSection = (section: string) => editingSection === section;
  const handleSave = () => { onSave(data); setEditingSection(null); };
  const handleCancel = () => { setData(safeAudience); setEditingSection(null); };

  function EditControls({ section }: { section: string }) {
    return isEditingSection(section) ? (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5 text-muted-foreground"><X className="h-4 w-4" /> Cancel</Button>
        <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save</Button>
      </div>
    ) : (
      <Button variant="outline" size="sm" onClick={() => setEditingSection(section)} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground truncate">{data.name}</h1>
        </div>
        <div className="flex items-center gap-3 mt-1.5 ml-10">
          <span className="text-xs text-muted-foreground flex items-center gap-1">Visibility: <Lock className="h-3 w-3" /> Private</span>
          <span className="text-xs text-muted-foreground/60">|</span>
          <span className="text-xs text-muted-foreground">Last updated: {data.lastUpdated}</span>
          <span className="text-xs text-muted-foreground/60">|</span>
          <span className="text-xs text-muted-foreground">Added by: {userName}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex gap-8">
            <div className="flex-1 min-w-0 space-y-8">

              {/* ── Audience Overview ── */}
              <div id="audience-overview" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Audience overview</h2>
                  </div>
                  <EditControls section="overview" />
                </div>
                <div className="px-6 py-6 space-y-6">
                  <div id="audience-description" className="space-y-2">
                    <SectionHeading id="" title="Audience description" subtitle="Summary of who your target Audience is, their key characteristics, responsibilities, pain points, and motivations." />
                    {isEditingSection("overview") ? (
                      <Textarea value={data.description} onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))} className="text-sm min-h-[100px] resize-none mt-3" />
                    ) : (
                      <p className="text-sm text-foreground/80 leading-relaxed mt-3">{data.description}</p>
                    )}
                  </div>

                  <div id="buying-triggers">
                    <SectionHeading id="" title="Buying triggers" subtitle="Events or circumstances that motivate the Audience to start looking for solutions like yours." />
                    <BulletList items={data.buyingTriggers} icon={Sparkles} iconClass="text-muted-foreground" isEditing={isEditingSection("overview")} onChange={(v) => setData(prev => ({ ...prev, buyingTriggers: v }))} />
                  </div>

                  <button onClick={() => setDescExpanded(!descExpanded)} className="flex items-center gap-1.5 text-sm font-medium text-foreground mx-auto hover:text-primary transition-colors">
                    {descExpanded ? "Less detail" : "More detail"}
                    {descExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <AnimatePresence>
                    {descExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden space-y-8">
                        <div className="border-t border-border/30 pt-6" id="use-case-requirements">
                          <SectionHeading id="" title="Use case requirements" subtitle="Capabilities your solution must offer to address the Audience's pain points." />
                          <BulletList items={data.useCaseRequirements} icon={Crosshair} iconClass="text-muted-foreground" isEditing={isEditingSection("overview")} onChange={(v) => setData(prev => ({ ...prev, useCaseRequirements: v }))} />
                        </div>
                        <div id="key-success-indicators">
                          <SectionHeading id="" title="Key success indicators" subtitle="" />
                          <BulletList items={data.keySuccessIndicators} icon={Check} iconClass="text-emerald-500" isEditing={isEditingSection("overview")} onChange={(v) => setData(prev => ({ ...prev, keySuccessIndicators: v }))} />
                        </div>
                        <div id="additional-characteristics">
                          <SectionHeading id="" title="Additional characteristics" subtitle="" />
                          {isEditingSection("overview") ? (
                            <Textarea value={data.additionalCharacteristics} onChange={(e) => setData(prev => ({ ...prev, additionalCharacteristics: e.target.value }))} className="text-sm min-h-[60px] resize-none mt-3" />
                          ) : (
                            <p className="text-sm text-muted-foreground/70 mt-3 italic">{data.additionalCharacteristics}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Core Messaging ── */}
              <div id="core-messaging" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Core messaging</h2>
                  </div>
                  <EditControls section="messaging" />
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <div id="positioning-statement">
                    <SectionHeading id="" title="Positioning statement" subtitle="" />
                    {isEditingSection("messaging") ? (
                      <Textarea value={data.positioningStatement} onChange={(e) => setData(prev => ({ ...prev, positioningStatement: e.target.value }))} className="text-sm min-h-[60px] resize-none mt-3" />
                    ) : (
                      <p className="text-sm text-foreground/80 leading-relaxed mt-3">{data.positioningStatement}</p>
                    )}
                  </div>
                  <div id="value-propositions">
                    <SectionHeading id="" title="Value propositions" subtitle="" />
                    <BulletList items={data.valuePropositions} icon={Check} iconClass="text-emerald-500" isEditing={isEditingSection("messaging")} onChange={(v) => setData(prev => ({ ...prev, valuePropositions: v }))} />
                  </div>
                </div>
              </div>

              {/* ── Engagement Patterns ── */}
              <div id="engagement-patterns" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Engagement patterns</h2>
                  </div>
                  <EditControls section="engagement" />
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <div id="engagement-triggers">
                    <SectionHeading id="" title="Engagement triggers" subtitle="" />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {data.engagementTriggers.map((trigger, i) => (
                        <div key={i}>
                          {isEditingSection("engagement") ? (
                            <div className="flex gap-1">
                              <Input value={trigger} onChange={(e) => { const next = [...data.engagementTriggers]; next[i] = e.target.value; setData(prev => ({ ...prev, engagementTriggers: next })); }} className="h-9 text-xs flex-1" />
                              <button onClick={() => setData(prev => ({ ...prev, engagementTriggers: prev.engagementTriggers.filter((_, idx) => idx !== i) }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-foreground/80 leading-relaxed h-full flex items-center">{trigger}</div>
                          )}
                        </div>
                      ))}
                      {isEditingSection("engagement") && (
                        <button onClick={() => setData(prev => ({ ...prev, engagementTriggers: [...prev.engagementTriggers, ""] }))} className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 rounded-lg border border-dashed border-primary/30 px-4 py-3"><Plus className="h-3 w-3" /> Add</button>
                      )}
                    </div>
                  </div>

                  <div id="attention-hooks">
                    <SectionHeading id="" title="Attention hooks" subtitle="" />
                    <div className="grid grid-cols-2 gap-2.5 mt-3">
                      {data.attentionHooks.map((hook, i) => (
                        <div key={i}>
                          {isEditingSection("engagement") ? (
                            <div className="flex gap-1">
                              <Input value={hook} onChange={(e) => { const next = [...data.attentionHooks]; next[i] = e.target.value; setData(prev => ({ ...prev, attentionHooks: next })); }} className="h-9 text-xs flex-1" />
                              <button onClick={() => setData(prev => ({ ...prev, attentionHooks: prev.attentionHooks.filter((_, idx) => idx !== i) }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-border/40 bg-primary/5 px-4 py-3 text-sm text-foreground/80 leading-relaxed h-full flex items-center">{hook}</div>
                          )}
                        </div>
                      ))}
                      {isEditingSection("engagement") && (
                        <button onClick={() => setData(prev => ({ ...prev, attentionHooks: [...prev.attentionHooks, ""] }))} className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 rounded-lg border border-dashed border-primary/30 px-4 py-3"><Plus className="h-3 w-3" /> Add</button>
                      )}
                    </div>
                  </div>

                  {/* Objections & Responses */}
                  <div id="objections-responses" className="space-y-3">
                    <SectionHeading id="" title="Common objections and responses" subtitle="" />
                    <div className="space-y-6 mt-3">
                      {data.commonObjections.map((obj, i) => (
                        <div key={i} className="space-y-1.5">
                          {isEditingSection("engagement") ? (
                            <div className="space-y-2 rounded-lg border border-border/40 bg-muted/10 p-4">
                              <div className="flex gap-1.5">
                                <Input value={obj.objection} onChange={(e) => { const next = [...data.commonObjections]; next[i] = { ...next[i], objection: e.target.value }; setData(prev => ({ ...prev, commonObjections: next })); }} placeholder="Objection" className="h-8 text-sm flex-1" />
                                <button onClick={() => setData(prev => ({ ...prev, commonObjections: prev.commonObjections.filter((_, idx) => idx !== i) }))} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                              </div>
                              <Textarea value={obj.response} onChange={(e) => { const next = [...data.commonObjections]; next[i] = { ...next[i], response: e.target.value }; setData(prev => ({ ...prev, commonObjections: next })); }} placeholder="Response" className="text-sm min-h-[60px] resize-none" />
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-foreground">"{obj.objection}"</p>
                              <p className="text-sm text-muted-foreground/80 ml-4 leading-relaxed">{obj.response}</p>
                            </>
                          )}
                        </div>
                      ))}
                      {isEditingSection("engagement") && (
                        <button onClick={() => setData(prev => ({ ...prev, commonObjections: [...prev.commonObjections, { objection: "", response: "" }] }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"><Plus className="h-3 w-3" /> Add objection</button>
                      )}
                    </div>
                  </div>

                  {/* Proof Points */}
                  <div id="proof-points-evidence">
                    <SectionHeading id="" title="Proof points and evidence types" subtitle="" />
                    <div className="space-y-6 mt-4">
                      {data.proofPoints.map((group, gi) => (
                        <div key={gi}>
                          <h4 className="text-sm font-bold text-foreground mb-2">{group.category}</h4>
                          <div className="space-y-2">
                            {group.items.map((item, ii) => (
                              <div key={ii} className="flex items-start gap-2.5">
                                <Search className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                {isEditingSection("engagement") ? (
                                  <div className="flex-1 flex gap-1.5">
                                    <Input value={item} onChange={(e) => { const next = [...data.proofPoints]; const items = [...next[gi].items]; items[ii] = e.target.value; next[gi] = { ...next[gi], items }; setData(prev => ({ ...prev, proofPoints: next })); }} className="h-8 text-sm flex-1" />
                                    <button onClick={() => { const next = [...data.proofPoints]; next[gi] = { ...next[gi], items: next[gi].items.filter((_, idx) => idx !== ii) }; setData(prev => ({ ...prev, proofPoints: next })); }} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-foreground/80">{item}</span>
                                )}
                              </div>
                            ))}
                            {isEditingSection("engagement") && (
                              <button onClick={() => { const next = [...data.proofPoints]; next[gi] = { ...next[gi], items: [...next[gi].items, ""] }; setData(prev => ({ ...prev, proofPoints: next })); }} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 ml-6"><Plus className="h-3 w-3" /> Add item</button>
                            )}
                          </div>
                        </div>
                      ))}
                      {isEditingSection("engagement") && (
                        <button onClick={() => setData(prev => ({ ...prev, proofPoints: [...prev.proofPoints, { category: "New Category", items: [""] }] }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"><Plus className="h-3 w-3" /> Add category</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Language Patterns ── */}
              <div id="language-patterns" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Languages className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Language patterns</h2>
                  </div>
                  <EditControls section="language" />
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <div id="dos-and-donts" className="space-y-6">
                    <SectionHeading id="" title="Do's and Don'ts" subtitle="" />
                    <div className="space-y-6 mt-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-foreground">Do's</h4>
                        {data.dosAndDonts.dos.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            {isEditingSection("language") ? (
                              <div className="flex-1 flex gap-1">
                                <Input value={item} onChange={(e) => { const next = [...data.dosAndDonts.dos]; next[i] = e.target.value; setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: next } })); }} className="h-8 text-sm flex-1" />
                                <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: prev.dosAndDonts.dos.filter((_, idx) => idx !== i) } }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <span className="text-sm text-foreground/80">{item}</span>
                            )}
                          </div>
                        ))}
                        {isEditingSection("language") && (
                          <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: [...prev.dosAndDonts.dos, ""] } }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 ml-6"><Plus className="h-3 w-3" /> Add</button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-foreground">Don'ts</h4>
                        {data.dosAndDonts.donts.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <X className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                            {isEditingSection("language") ? (
                              <div className="flex-1 flex gap-1">
                                <Input value={item} onChange={(e) => { const next = [...data.dosAndDonts.donts]; next[i] = e.target.value; setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: next } })); }} className="h-8 text-sm flex-1" />
                                <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: prev.dosAndDonts.donts.filter((_, idx) => idx !== i) } }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <span className="text-sm text-foreground/80">{item}</span>
                            )}
                          </div>
                        ))}
                        {isEditingSection("language") && (
                          <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: [...prev.dosAndDonts.donts, ""] } }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 ml-6"><Plus className="h-3 w-3" /> Add</button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionHeading id="power-phrases" title="Power phrases" subtitle="" />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {data.powerPhrases.map((phrase, i) => (
                        <div key={i}>
                          {isEditingSection("language") ? (
                            <div className="flex gap-1">
                              <Input value={phrase} onChange={(e) => { const next = [...data.powerPhrases]; next[i] = e.target.value; setData(prev => ({ ...prev, powerPhrases: next })); }} className="h-9 text-xs flex-1" />
                              <button onClick={() => setData(prev => ({ ...prev, powerPhrases: prev.powerPhrases.filter((_, idx) => idx !== i) }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-foreground font-medium leading-relaxed h-full flex items-center">{phrase}</div>
                          )}
                        </div>
                      ))}
                      {isEditingSection("language") && (
                        <button onClick={() => setData(prev => ({ ...prev, powerPhrases: [...prev.powerPhrases, ""] }))} className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 rounded-lg border border-dashed border-primary/30 px-4 py-3"><Plus className="h-3 w-3" /> Add</button>
                      )}
                    </div>
                  </div>

                  <div>
                    <SectionHeading id="power-words" title="Power words" subtitle="" />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {data.powerWords.map((word, i) => (
                        <div key={i}>
                          {isEditingSection("language") ? (
                            <div className="flex gap-1">
                              <Input value={word} onChange={(e) => { const next = [...data.powerWords]; next[i] = e.target.value; setData(prev => ({ ...prev, powerWords: next })); }} className="h-7 text-xs w-28" />
                              <button onClick={() => setData(prev => ({ ...prev, powerWords: prev.powerWords.filter((_, idx) => idx !== i) }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <span className="text-sm px-3 py-1 rounded-md bg-muted/50 border border-border/40 text-foreground/80">{word}</span>
                          )}
                        </div>
                      ))}
                      {isEditingSection("language") && (
                        <button onClick={() => setData(prev => ({ ...prev, powerWords: [...prev.powerWords, ""] }))} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"><Plus className="h-3 w-3" /> Add</button>
                      )}
                    </div>
                  </div>

                  <div id="technical-level">
                    <SectionHeading id="" title="Technical level" subtitle="" />
                    <div className="mt-2">
                      {isEditingSection("language") ? (
                        <Textarea value={data.technicalLevel} onChange={(e) => setData(prev => ({ ...prev, technicalLevel: e.target.value }))} className="text-sm min-h-[120px] resize-none" />
                      ) : (
                        <p className="text-sm text-foreground/80 whitespace-pre-line">{data.technicalLevel}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Content Refinement ── */}
              <div id="content-refinement" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <ListChecks className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Content refinement</h2>
                  </div>
                  <EditControls section="refinement" />
                </div>
                <div className="px-6 py-6 max-w-3xl">
                  <SectionHeading id="refinement-checklist" title="Refinement checklist" subtitle="" />
                  <BulletList items={data.refinementChecklist} icon={Check} iconClass="text-emerald-500" isEditing={isEditingSection("refinement")} onChange={(r) => setData(prev => ({ ...prev, refinementChecklist: r }))} />
                </div>
              </div>

              <div className="h-8" />
            </div>

            {/* Right sidebar */}
            <div className="hidden lg:block w-52 shrink-0">
              <AudiencePageSidebar
                itemName={audience.name}
                activeSection={activeSidebarSection}
                onSectionClick={(id) => {
                  setActiveSidebarSection(id);
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
