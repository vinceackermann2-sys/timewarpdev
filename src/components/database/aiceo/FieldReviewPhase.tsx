/**
 * FieldReviewPhase — Phase 2 of onboarding.
 * After URL scrape, shows fields aligned 1:1 to the Business DNA pillar model
 * (Brand 11 fields, Product 15 fields, Audience 13 fields). Every field is
 * inline-editable and appears with a richer skeleton while data streams in.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Package, Users, Palette, ChevronDown, ChevronUp,
  Pencil, Check, X, Plus, ImageIcon, Loader2,
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

/* ── Skeleton Pillar ── */
function PillarSkeleton({ icon: Icon, title, fieldCount, accent }: {
  icon: React.ComponentType<{ className?: string }>; title: string; fieldCount: number; accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
      <div className={cn("px-6 py-4 flex items-center gap-3 bg-gradient-to-r", accent)}>
        <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-foreground/40" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-foreground tracking-tight">{title}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{fieldCount} fields</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4 border-t border-border/30">
        {Array.from({ length: Math.min(5, fieldCount) }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className={cn("h-4 rounded", i % 2 === 0 ? "w-full" : "w-2/3")} />
            {i % 3 === 0 && (
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-24 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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
      <div className="space-y-4">
        <PillarSkeleton icon={Package} title="Product DNA" fieldCount={15} accent="from-blue-500/[0.06] to-transparent" />
        <PillarSkeleton icon={Users} title="Audience DNA" fieldCount={13} accent="from-violet-500/[0.06] to-transparent" />
        <PillarSkeleton icon={Palette} title="Brand DNA" fieldCount={11} accent="from-amber-500/[0.06] to-transparent" />
      </div>
    );
  }

  return <FieldReviewForm extractedProduct={extractedProduct} onComplete={onComplete} />;
}

function FieldReviewForm({ extractedProduct, onComplete }: { extractedProduct: ExtractedProduct, onComplete: FieldReviewPhaseProps["onComplete"] }) {
  const rawP = extractedProduct.rawProduct || {};
  const aud = extractedProduct.audienceData || {};
  const rawA = extractedProduct.rawAudience || {};
  const b = extractedProduct.brandData || {};
  const rawB = extractedProduct.rawBrand || {};

  // ── PRODUCT (15 fields, doc-aligned) ──
  const [p1_description, setP1] = useState(extractedProduct.description || "");
  const [p2_catalogue, setP2] = useState<string[]>((extractedProduct.offers || []).map((o: any) => o.title).filter(Boolean));
  const [p3_features, setP3] = useState<string[]>(extractedProduct.features || []);
  const [p4_benefits, setP4] = useState<string[]>(extractedProduct.benefits || []);
  const [p5_howItWorks, setP5] = useState(rawP.howItWorks || "");
  const [p6_pricing, setP6] = useState<string[]>((extractedProduct.offers || []).map((o: any) => `${o.title || ""} – ${o.salePrice || o.originalPrice || ""}`.trim()).filter((s: string) => s !== "–"));
  const [p7_useCases, setP7] = useState<string[]>(extractedProduct.useCases || rawP.useCases || []);
  const [p8_promise, setP8] = useState(rawP.positioningStatement || "");
  const [p9_usps, setP9] = useState<string[]>(extractedProduct.uniqueSellingPoints || []);
  const [p10_competitors, setP10] = useState<string[]>(rawP.competitiveAdvantages || []);
  const [p11_painPoints, setP11] = useState<string[]>(extractedProduct.painPoints || []);
  const [p12_objections, setP12] = useState<string[]>(rawP.objections || []);
  const [p13_socialProof, setP13] = useState<string[]>(rawP.socialProof || []);
  const [p14_cogs, setP14] = useState(rawP.cogs || "");
  const [p15_checklist, setP15] = useState<string[]>(rawP.refinementChecklist || []);

  // ── AUDIENCE (13 fields, doc-aligned) ──
  const [a1_description, setA1] = useState(aud.description || "");
  const [a2_segmentation, setA2] = useState(rawA.segmentationModel || aud.name || "");
  const [a3_persona, setA3] = useState(aud.name || "");
  const [a4_triggers, setA4] = useState<string[]>(aud.buyingTriggers || []);
  const [a5_journey, setA5] = useState(rawA.customerJourney || "");
  const [a6_decisionCriteria, setA6] = useState<string[]>(rawA.useCaseRequirements || []);
  const [a7_painArchitecture, setA7] = useState<string[]>(aud.valuePropositions || rawA.painPoints || []);
  const [a8_objections, setA8] = useState<string[]>(rawA.objections || []);
  const [a9_engagement, setA9] = useState(rawA.engagementPatterns || "");
  const [a10_language, setA10] = useState<string[]>([...(rawA.powerPhrases || []), ...(rawA.powerWords || [])]);
  const [a11_proof, setA11] = useState<string[]>(rawA.keySuccessIndicators || []);
  const [a12_retention, setA12] = useState(rawA.retentionDrivers || "");
  const [a13_checklist, setA13] = useState<string[]>(rawA.refinementChecklist || []);

  // ── BRAND (11 fields, doc-aligned) ──
  const [b1_description, setB1] = useState(b.description || rawB.description || "");
  const [b2_mission, setB2] = useState(b.mission || rawB.mission || "");
  const [b3_vision, setB3] = useState(b.vision || rawB.vision || "");
  const [b4_values, setB4] = useState<string[]>(b.values || rawB.values || []);
  const [b5_voice, setB5] = useState(b.voice || rawB.voice || rawB.toneOfVoice || "");
  // 6. Visual Identity (logos/colors/typography) — read-only display
  const colors = b.colors || rawB.colors;
  const logos: string[] = b.logoUrls || rawB.logoUrls || [];
  const typography = b.typography || rawB.typography || { fontFamily: "" };
  const [b7_domain, setB7] = useState(b.category || rawB.category || "");
  const [b7_businessType, setB7b] = useState(b.businessType || rawB.businessType || "");
  const [b8_personality, setB8] = useState<string[]>(b.personalityTags || rawB.personalityTags || []);
  const [b9_tagline, setB9] = useState<string[]>(b.taglines || rawB.taglines || []);
  const [b10_social, setB10] = useState<string[]>(b.socialPresence || rawB.socialLinks || []);
  const [b11_checklist, setB11] = useState<string[]>(b.refinementChecklist || rawB.refinementChecklist || []);

  const [brandName, setBrandName] = useState(b.name || extractedProduct.name || "");
  const [productName, setProductName] = useState(extractedProduct.name || "");

  const handleConfirm = () => {
    const product: ExtractedProduct = {
      ...extractedProduct,
      name: productName,
      description: p1_description,
      features: p3_features,
      benefits: p4_benefits,
      painPoints: p11_painPoints,
      useCases: p7_useCases,
      uniqueSellingPoints: p9_usps,
      rawProduct: {
        ...rawP,
        name: productName,
        description: p1_description,
        features: p3_features,
        benefits: p4_benefits,
        howItWorks: p5_howItWorks,
        useCases: p7_useCases,
        positioningStatement: p8_promise,
        uniqueSellingPoints: p9_usps,
        competitiveAdvantages: p10_competitors,
        painPoints: p11_painPoints,
        objections: p12_objections,
        socialProof: p13_socialProof,
        cogs: p14_cogs,
        refinementChecklist: p15_checklist,
      },
    };
    const audiences: AudienceDraft[] = [{
      ...rawA,
      name: a3_persona || "Primary Audience",
      description: a1_description,
      buyingTriggers: a4_triggers,
      valuePropositions: a7_painArchitecture,
      segmentationModel: a2_segmentation,
      customerJourney: a5_journey,
      useCaseRequirements: a6_decisionCriteria,
      objections: a8_objections,
      engagementPatterns: a9_engagement,
      powerPhrases: a10_language,
      keySuccessIndicators: a11_proof,
      retentionDrivers: a12_retention,
      refinementChecklist: a13_checklist,
    }];
    const brand: BrandDraft = {
      ...rawB,
      name: brandName,
      category: b7_domain,
      businessType: b7_businessType,
      description: b1_description,
      mission: b2_mission,
      vision: b3_vision,
      values: b4_values,
      voice: b5_voice,
      personalityTags: b8_personality,
      taglines: b9_tagline,
      socialPresence: b10_social,
      refinementChecklist: b11_checklist,
      colors,
      typography,
      logoUrls: logos,
      visualIdentity: b.visualIdentity || rawB.visualIdentity || {},
    };
    onComplete(product, audiences, brand);
  };

  return (
    <div className="space-y-4">
      {/* Product Pillar — 15 fields */}
      <PillarSection title="Product DNA" icon={Package} accent="from-blue-500/[0.06] to-transparent" badge="15 fields · What you build & deliver" defaultOpen={true}>
        <EditableField label="Product Name" value={productName} onChange={setProductName} />
        <EditableField label="1. Product Description" value={p1_description} onChange={setP1} multiline />
        <FieldList label="2. Product Catalogue" tags={p2_catalogue} onChange={setP2} placeholder="Add SKU…" />
        <FieldList label="3. Features" tags={p3_features} onChange={setP3} placeholder="Add a feature…" />
        <FieldList label="4. Benefits" tags={p4_benefits} onChange={setP4} placeholder="Add a benefit…" />
        <EditableField label="5. How It Works" value={p5_howItWorks} onChange={setP5} multiline />
        <FieldList label="6. Offers & Pricing" tags={p6_pricing} onChange={setP6} placeholder="Tier — price" />
        <FieldList label="7. Use Cases" tags={p7_useCases} onChange={setP7} placeholder="Add a use case…" />
        <EditableField label="8. Product Promise" value={p8_promise} onChange={setP8} multiline />
        <FieldList label="9. Unique Selling Points (USPs)" tags={p9_usps} onChange={setP9} placeholder="Add a USP…" />
        <FieldList label="10. Competitor Comparison" tags={p10_competitors} onChange={setP10} placeholder="vs Competitor: …" />
        <FieldList label="11. Pain Points Solved" tags={p11_painPoints} onChange={setP11} placeholder="Add a pain point…" />
        <FieldList label="12. Objections & Responses" tags={p12_objections} onChange={setP12} placeholder="Objection → Response" />
        <FieldList label="13. Social Proof" tags={p13_socialProof} onChange={setP13} placeholder="Testimonial / award…" />
        <EditableField label="14. COGS (Cost of Goods Sold)" value={p14_cogs} onChange={setP14} />
        <FieldList label="15. Product Completeness Checklist" tags={p15_checklist} onChange={setP15} placeholder="Add a check item…" />

        {(extractedProduct.images || []).length > 0 && (
          <div className="space-y-1.5 pt-2">
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

      {/* Audience Pillar — 13 fields */}
      <PillarSection title="Audience DNA" icon={Users} accent="from-violet-500/[0.06] to-transparent" badge="13 fields · Who you serve" defaultOpen={true}>
        <EditableField label="1. Audience Description" value={a1_description} onChange={setA1} multiline />
        <EditableField label="2. Segmentation Model" value={a2_segmentation} onChange={setA2} multiline />
        <EditableField label="3. Buyer Persona" value={a3_persona} onChange={setA3} />
        <FieldList label="4. Buying Triggers" tags={a4_triggers} onChange={setA4} placeholder="Add a trigger…" />
        <EditableField label="5. Customer Journey Map" value={a5_journey} onChange={setA5} multiline />
        <FieldList label="6. Decision Criteria" tags={a6_decisionCriteria} onChange={setA6} placeholder="Add a criterion…" />
        <FieldList label="7. Pain Point Architecture" tags={a7_painArchitecture} onChange={setA7} placeholder="Add a pain point…" />
        <FieldList label="8. Objections & Responses" tags={a8_objections} onChange={setA8} placeholder="Objection → Response" />
        <EditableField label="9. Engagement Patterns" value={a9_engagement} onChange={setA9} multiline />
        <FieldList label="10. Language Patterns" tags={a10_language} onChange={setA10} placeholder="Phrase / word…" />
        <FieldList label="11. Proof Hierarchy" tags={a11_proof} onChange={setA11} placeholder="Proof point…" />
        <EditableField label="12. Retention & Loyalty Drivers" value={a12_retention} onChange={setA12} multiline />
        <FieldList label="13. Audience Refinement Checklist" tags={a13_checklist} onChange={setA13} placeholder="Add a check item…" />
      </PillarSection>

      {/* Brand Pillar — 11 fields */}
      <PillarSection title="Brand DNA" icon={Palette} accent="from-amber-500/[0.06] to-transparent" badge="11 fields · Identity & perception" defaultOpen={true}>
        <EditableField label="Brand Name" value={brandName} onChange={setBrandName} />
        <EditableField label="1. Brand Description" value={b1_description} onChange={setB1} multiline />
        <EditableField label="2. Mission Statement" value={b2_mission} onChange={setB2} multiline />
        <EditableField label="3. Vision Statement" value={b3_vision} onChange={setB3} multiline />
        <FieldList label="4. Brand Values" tags={b4_values} onChange={setB4} placeholder="Add a value…" />
        <EditableField label="5. Brand Voice" value={b5_voice} onChange={setB5} multiline />

        {/* 6. Visual Identity */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">6. Visual Identity</label>
          {colors && (
            <div className="flex flex-wrap gap-3">
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
          )}
          {logos.length > 0 && (
            <div className="flex gap-2 pt-1">
              {logos.slice(0, 3).map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-xl border border-border/40 bg-background p-2 overflow-hidden">
                  <img src={url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          )}
          {typography?.fontFamily && (
            <p className="text-[13px] text-foreground"><span className="text-muted-foreground">Typography:</span> {typography.fontFamily}</p>
          )}
          {!colors && logos.length === 0 && !typography?.fontFamily && (
            <p className="text-[13px] text-muted-foreground/50 italic">Not detected from URL</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableField label="7. Domain & Category" value={b7_domain} onChange={setB7} />
          <EditableField label="7b. Business Type" value={b7_businessType} onChange={setB7b} />
        </div>
        <FieldList label="8. Brand Personality Tags" tags={b8_personality} onChange={setB8} placeholder="e.g. bold, playful…" />
        <FieldList label="9. Tagline & Power Lines" tags={b9_tagline} onChange={setB9} placeholder="Add a tagline…" />
        <FieldList label="10. Social Presence" tags={b10_social} onChange={setB10} placeholder="Channel / handle…" />
        <FieldList label="11. Brand Completeness Checklist" tags={b11_checklist} onChange={setB11} placeholder="Add a check item…" />
      </PillarSection>

      {/* Confirm Button */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex justify-end pt-2">
        <button
          onClick={handleConfirm}
          disabled={!productName.trim() && !brandName.trim()}
          className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white text-[15px] font-semibold px-7 py-3 rounded-2xl flex items-center gap-2.5 transition-all shadow-sm hover:shadow-md"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}

function FieldList({ label, tags, onChange, placeholder }: {
  label: string; tags: string[]; onChange: (t: string[]) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <TagListEditor tags={tags} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
