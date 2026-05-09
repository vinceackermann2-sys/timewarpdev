/**
 * FieldReviewPhase — Phase 2 of onboarding.
 * After URL scrape, shows all extracted fields across Product, Audience, Brand
 * in collapsible pillar cards. Every field is inline-editable.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Package, Users, Palette, ChevronDown, ChevronUp,
  Pencil, Check, X, Plus, ImageIcon, Loader2
} from "lucide-react";
import { consumeNdjsonStream } from "@/lib/streamNdjson";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ExtractedProduct } from "./ProductInputPhase";
import type { AudienceDraft } from "./AudienceConfirmPhase";
import type { BrandDraft } from "./BrandConfirmPhase";

interface FieldReviewPhaseProps {
  targetUrl: string;
  onComplete: (product: ExtractedProduct, audiences: AudienceDraft[], brand: BrandDraft) => void;
}

/* ── Tag List Editor ── */
function TagListEditor({ tags, onChange, placeholder }: {
  tags: string[]; onChange: (t: string[]) => void; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) { onChange([...tags, v]); setDraft(""); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/[0.07] border border-primary/10 text-[12px] font-medium text-foreground/80">
            {t}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-border/50 rounded-lg px-3 py-1.5 text-[13px] bg-background outline-none focus:ring-1 focus:ring-primary/20"
          placeholder={placeholder || "Add item…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button onClick={add} className="text-[12px] font-medium text-primary flex items-center gap-1 px-2">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  );
}

/* ── Inline Editable Field ── */
function EditableField({ label, value, onChange, multiline }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
        <button onClick={() => setEditing(!editing)} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          {editing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
        </button>
      </div>
      {editing ? (
        multiline ? (
          <textarea
            className="w-full border border-border/50 rounded-xl px-3 py-2 text-[13px] bg-background outline-none focus:ring-1 focus:ring-primary/20 resize-none"
            rows={3} value={value} onChange={(e) => onChange(e.target.value)} autoFocus
          />
        ) : (
          <input
            className="w-full border border-border/50 rounded-xl px-3 py-2 text-[13px] bg-background outline-none focus:ring-1 focus:ring-primary/20"
            value={value} onChange={(e) => onChange(e.target.value)} autoFocus
          />
        )
      ) : (
        <p className={cn("text-[14px]", value ? "text-foreground" : "text-muted-foreground/50 italic")}>
          {value || "Not detected — click edit to add"}
        </p>
      )}
    </div>
  );
}

/* ── Pillar Section ── */
function PillarSection({ title, icon: Icon, accent, badge, defaultOpen, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full px-6 py-4 flex items-center gap-3 text-left transition-colors",
          "bg-gradient-to-r hover:brightness-[1.02]",
          accent,
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-foreground tracking-tight">{title}</p>
          {badge && <p className="text-[12px] text-muted-foreground mt-0.5">{badge}</p>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 py-5 space-y-4 border-t border-border/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main Component ── */
export function FieldReviewPhase({ targetUrl, onComplete }: FieldReviewPhaseProps) {
  const [extractedProduct, setExtractedProduct] = useState<ExtractedProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Connecting to website...");
  const [loadingPercent, setLoadingPercent] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");
        
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-product`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ url: targetUrl, mode: "core", stream: true }),
          }
        );
        if (!res.ok) throw new Error("Failed to analyze URL");
        if (!res.body) throw new Error("No response body");

        await consumeNdjsonStream(res, (data: any) => {
          if (data.type === "progress") {
            setLoadingStage(data.stage || "Analyzing...");
            setLoadingPercent(data.percent || loadingPercent);
          } else if (data.type === "result") {
            const resultData = data.data;
            const product = resultData.extracted?.product || {};
            const brand = resultData.extracted?.brand || {};
            const audience = resultData.extracted?.audience || {};
            setExtractedProduct({
              name: product.name || brand.name || "My Product",
              category: product.category || brand.category || "",
              businessType: brand.businessType || "general",
              description: product.description || "",
              features: product.features || [],
              benefits: product.benefits || [],
              painPoints: product.painPoints || [],
              useCases: product.useCases || [],
              uniqueSellingPoints: product.uniqueSellingPoints || [],
              offers: product.offers || [],
              images: product.images || [],
              brandData: brand,
              audienceData: audience,
              sourceUrl: targetUrl,
              rawProduct: product,
              rawAudience: audience,
              rawBrand: brand,
            });
            setIsLoading(false);
          } else if (data.type === "error") {
            throw new Error(data.error || "Analysis failed");
          }
        });
      } catch (err: any) {
        setError(err.message || "Could not analyze that URL.");
        setIsLoading(false);
      }
    })();
  }, [targetUrl]);

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-[14px] text-destructive">{error}</p>
        <button onClick={() => window.location.reload()} className="text-primary text-[13px] hover:underline">Retry</button>
      </div>
    );
  }

  if (isLoading || !extractedProduct) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-foreground truncate">{targetUrl}</p>
              <p className="text-[13px] text-muted-foreground">{loadingStage}</p>
            </div>
            <p className="text-[14px] font-bold text-primary">{loadingPercent}%</p>
          </div>
          <Progress value={loadingPercent} className="h-2" />
        </div>

        <div className="space-y-4">
          <Skeleton className="w-full h-[72px] rounded-2xl bg-card border border-border/20" />
          <Skeleton className="w-full h-[72px] rounded-2xl bg-card border border-border/20" />
          <Skeleton className="w-full h-[72px] rounded-2xl bg-card border border-border/20" />
        </div>
      </div>
    );
  }

  return <FieldReviewForm extractedProduct={extractedProduct} onComplete={onComplete} />;
}

function FieldReviewForm({ extractedProduct, onComplete }: { extractedProduct: ExtractedProduct, onComplete: FieldReviewPhaseProps["onComplete"] }) {
  // Product state
  const [name, setName] = useState(extractedProduct.name || "");
  const [description, setDescription] = useState(extractedProduct.description || "");
  const [features, setFeatures] = useState<string[]>(extractedProduct.features || []);
  const [benefits, setBenefits] = useState<string[]>(extractedProduct.benefits || []);
  const [painPoints, setPainPoints] = useState<string[]>(extractedProduct.painPoints || []);
  const [usps, setUsps] = useState<string[]>(extractedProduct.uniqueSellingPoints || []);

  const rawP = extractedProduct.rawProduct || {};
  const [categoryP, setCategoryP] = useState(extractedProduct.category || "");
  const [useCases, setUseCases] = useState<string[]>(rawP.useCases || extractedProduct.useCases || []);
  const [targetScenarios, setTargetScenarios] = useState<string[]>(rawP.targetScenarios || []);
  const [positioningP, setPositioningP] = useState(rawP.positioningStatement || "");
  const [competitiveAdvantages, setCompetitiveAdvantages] = useState<string[]>(rawP.competitiveAdvantages || []);
  const [powerPhrasesP, setPowerPhrasesP] = useState<string[]>(rawP.powerPhrases || []);
  const [powerWordsP, setPowerWordsP] = useState<string[]>(rawP.powerWords || []);
  const [technicalLevelP, setTechnicalLevelP] = useState(rawP.technicalLevel || "");
  const [refinementChecklistP, setRefinementChecklistP] = useState<string[]>(rawP.refinementChecklist || []);

  // Audience state
  const aud = extractedProduct.audienceData || {};
  const rawA = extractedProduct.rawAudience || {};
  const [audName, setAudName] = useState(aud.name || "");
  const [audDesc, setAudDesc] = useState(aud.description || "");
  const [triggers, setTriggers] = useState<string[]>(aud.buyingTriggers || []);
  const [valueProp, setValueProp] = useState<string[]>(aud.valuePropositions || []);
  const [useCaseRequirements, setUseCaseRequirements] = useState<string[]>(rawA.useCaseRequirements || []);
  const [keySuccessIndicators, setKeySuccessIndicators] = useState<string[]>(rawA.keySuccessIndicators || []);
  const [positioningA, setPositioningA] = useState(rawA.positioningStatement || "");
  const [engagementTriggers, setEngagementTriggers] = useState<string[]>(rawA.engagementTriggers || []);
  const [attentionHooks, setAttentionHooks] = useState<string[]>(rawA.attentionHooks || []);
  const [powerPhrasesA, setPowerPhrasesA] = useState<string[]>(rawA.powerPhrases || []);
  const [powerWordsA, setPowerWordsA] = useState<string[]>(rawA.powerWords || []);
  const [technicalLevelA, setTechnicalLevelA] = useState(rawA.technicalLevel || "");
  const [additionalCharacteristics, setAdditionalCharacteristics] = useState(rawA.additionalCharacteristics || "");

  // Brand state
  const b = extractedProduct.brandData || {};
  const rawB = extractedProduct.rawBrand || {};
  const [brandName, setBrandName] = useState(b.name || extractedProduct.name || "");
  const [brandCategory, setBrandCategory] = useState(b.category || rawB.category || "");
  const [businessType, setBusinessType] = useState(b.businessType || rawB.businessType || "");
  const colors = b.colors || rawB.colors;
  const logos: string[] = b.logoUrls || rawB.logoUrls || [];
  const typography = b.typography || rawB.typography || { fontFamily: "" };
  const [websiteRules, setWebsiteRules] = useState<string[]>(b.visualIdentity?.websiteRules || rawB.visualIdentity?.websiteRules || []);
  const [buttonRules, setButtonRules] = useState<string[]>(b.visualIdentity?.buttonRules || rawB.visualIdentity?.buttonRules || []);
  const [socialMediaRules, setSocialMediaRules] = useState<string[]>(b.visualIdentity?.socialMediaRules || rawB.visualIdentity?.socialMediaRules || []);
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>(b.visualIdentity?.moodboardUrls || rawB.visualIdentity?.moodboardUrls || []);
  const [iconConcepts, setIconConcepts] = useState<string[]>(b.visualIdentity?.iconConcepts || rawB.visualIdentity?.iconConcepts || []);

  const handleConfirm = () => {
    const product: ExtractedProduct = {
      ...extractedProduct,
      rawProduct: {
        ...(extractedProduct.rawProduct || {}),
        name, category: categoryP, description, features, benefits, painPoints, uniqueSellingPoints: usps,
        useCases, targetScenarios, positioningStatement: positioningP,
        competitiveAdvantages, powerPhrases: powerPhrasesP, powerWords: powerWordsP,
        technicalLevel: technicalLevelP, refinementChecklist: refinementChecklistP
      },
      name, category: categoryP, description, features, benefits, painPoints,
      uniqueSellingPoints: usps,
    };
    const audiences: AudienceDraft[] = [{
      ...(extractedProduct.rawAudience || {}),
      name: audName || "Primary Audience",
      description: audDesc,
      buyingTriggers: triggers,
      valuePropositions: valueProp,
      useCaseRequirements, keySuccessIndicators, positioningStatement: positioningA,
      engagementTriggers, attentionHooks, powerPhrases: powerPhrasesA,
      powerWords: powerWordsA, technicalLevel: technicalLevelA, additionalCharacteristics
    }];
    const brand: BrandDraft = {
      ...(extractedProduct.rawBrand || {}),
      name: brandName,
      category: brandCategory,
      businessType,
      colors: colors,
      typography: typography,
      logoUrls: logos,
      visualIdentity: {
        ...(b.visualIdentity || rawB.visualIdentity || {}),
        websiteRules,
        buttonRules,
        socialMediaRules,
        moodboardUrls,
        iconConcepts,
      },
    };
    onComplete(product, audiences, brand);
  };

  // The user explicitly wants these fields in the UI.
  // 15 Product, 13 Audience, 11 Brand.
  // We don't display counts anymore because they are implicitly just the fully expanded form,
  // but if needed they are here:
  const productFieldCount = 15;
  const audFieldCount = 13;
  const brandFieldCount = 11;

  return (
    <div className="space-y-4">
      {/* Product Pillar */}
      <PillarSection
        title="Product"
        icon={Package}
        accent="from-blue-500/[0.06] to-transparent"
        badge={`${productFieldCount} fields`}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EditableField label="Product Name" value={name} onChange={setName} />
          <EditableField label="Category" value={categoryP} onChange={setCategoryP} />
        </div>
        <EditableField label="Description" value={description} onChange={setDescription} multiline />
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Features</label>
          <TagListEditor tags={features} onChange={setFeatures} placeholder="Add a feature…" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Benefits</label>
          <TagListEditor tags={benefits} onChange={setBenefits} placeholder="Add a benefit…" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pain Points Solved</label>
          <TagListEditor tags={painPoints} onChange={setPainPoints} placeholder="Add a pain point…" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Unique Selling Points</label>
          <TagListEditor tags={usps} onChange={setUsps} placeholder="Add a USP…" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Use Cases</label>
          <TagListEditor tags={useCases} onChange={setUseCases} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Target Scenarios</label>
          <TagListEditor tags={targetScenarios} onChange={setTargetScenarios} />
        </div>
        <EditableField label="Positioning Statement" value={positioningP} onChange={setPositioningP} multiline />
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Competitive Advantages</label>
          <TagListEditor tags={competitiveAdvantages} onChange={setCompetitiveAdvantages} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Power Phrases</label>
          <TagListEditor tags={powerPhrasesP} onChange={setPowerPhrasesP} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Power Words</label>
          <TagListEditor tags={powerWordsP} onChange={setPowerWordsP} />
        </div>
        <EditableField label="Technical Level" value={technicalLevelP} onChange={setTechnicalLevelP} />
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Refinement Checklist</label>
          <TagListEditor tags={refinementChecklistP} onChange={setRefinementChecklistP} />
        </div>
        {(extractedProduct.images || []).length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Images Found
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(extractedProduct.images || []).slice(0, 6).map((img: string, i: number) => (
                <div key={i} className="w-16 h-16 rounded-xl border border-border/40 bg-background p-1 shrink-0 overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        )}
      </PillarSection>

      {/* Audience Pillar */}
      <PillarSection
        title="Audience"
        icon={Users}
        accent="from-violet-500/[0.06] to-transparent"
        badge={`${audFieldCount} fields`}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableField label="Audience Name" value={audName} onChange={setAudName} />
        </div>
        <EditableField label="Description" value={audDesc} onChange={setAudDesc} multiline />
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Buying Triggers</label>
          <TagListEditor tags={triggers} onChange={setTriggers} placeholder="Add a trigger…" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Value Propositions</label>
          <TagListEditor tags={valueProp} onChange={setValueProp} placeholder="Add a value prop…" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Use Case Requirements</label>
          <TagListEditor tags={useCaseRequirements} onChange={setUseCaseRequirements} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Key Success Indicators</label>
          <TagListEditor tags={keySuccessIndicators} onChange={setKeySuccessIndicators} />
        </div>
        <EditableField label="Positioning Statement" value={positioningA} onChange={setPositioningA} multiline />
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Engagement Triggers</label>
          <TagListEditor tags={engagementTriggers} onChange={setEngagementTriggers} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Attention Hooks</label>
          <TagListEditor tags={attentionHooks} onChange={setAttentionHooks} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Power Phrases</label>
          <TagListEditor tags={powerPhrasesA} onChange={setPowerPhrasesA} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Power Words</label>
          <TagListEditor tags={powerWordsA} onChange={setPowerWordsA} />
        </div>
        <EditableField label="Technical Level" value={technicalLevelA} onChange={setTechnicalLevelA} />
        <EditableField label="Additional Characteristics" value={additionalCharacteristics} onChange={setAdditionalCharacteristics} multiline />
      </PillarSection>

      {/* Brand Pillar */}
      <PillarSection
        title="Brand"
        icon={Palette}
        accent="from-amber-500/[0.06] to-transparent"
        badge={`${brandFieldCount} fields`}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <EditableField label="Brand Name" value={brandName} onChange={setBrandName} />
          <EditableField label="Category" value={brandCategory} onChange={setBrandCategory} />
          <EditableField label="Business Type" value={businessType} onChange={setBusinessType} />
        </div>
        {colors && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Colors</label>
            <div className="flex gap-3">
              {[
                { label: "Primary", value: colors.primary },
                { label: "Secondary", value: colors.secondary },
                { label: "Background", value: colors.background },
                { label: "Text", value: colors.text },
              ].filter(c => c.value).map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-border/40 shadow-sm" style={{ backgroundColor: c.value }} />
                  <div>
                    <p className="text-[11px] text-muted-foreground">{c.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/70">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {logos.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Logos</label>
            <div className="flex gap-2">
              {logos.slice(0, 3).map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-xl border border-border/40 bg-background p-2 overflow-hidden">
                  <img src={url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        )}
        {typography?.fontFamily && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Typography</label>
            <p className="text-[13px] text-foreground">{typography.fontFamily}</p>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Website Rules</label>
          <TagListEditor tags={websiteRules} onChange={setWebsiteRules} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Button Rules</label>
          <TagListEditor tags={buttonRules} onChange={setButtonRules} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Social Media Rules</label>
          <TagListEditor tags={socialMediaRules} onChange={setSocialMediaRules} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Moodboard URLs</label>
          <TagListEditor tags={moodboardUrls} onChange={setMoodboardUrls} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Icon Concepts</label>
          <TagListEditor tags={iconConcepts} onChange={setIconConcepts} />
        </div>
      </PillarSection>

      {/* Confirm Button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-end pt-2"
      >
        <button
          onClick={handleConfirm}
          disabled={!name.trim() && !brandName.trim()}
          className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white text-[15px] font-semibold px-7 py-3 rounded-2xl flex items-center gap-2.5 transition-all shadow-sm hover:shadow-md"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
