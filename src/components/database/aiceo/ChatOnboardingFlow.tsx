/**
 * ChatOnboardingFlow — Product-first onboarding.
 *
 * Flow:
 *   Phase 1: Product input  → URL scrape only
 *   Phase 2: Field review   → editable cards for Product/Audience/Brand
 *   Phase 3: Connect tools  → skippable, shows pillar-to-tool mapping
 *   Phase 4: Forging        → saves everything + triggers enrich-pillars
 *   Phase 5: Name agent     → user names their AI agent
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, WandSparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeWithTimeout";
import { useBusinessDNA, type BrandEntry, type ProductEntry, type AudienceEntry } from "@/components/database/BusinessDNAContext";
import { DEFAULT_PRODUCT } from "@/components/database/ProductDetailView";
import { DEFAULT_AUDIENCE } from "@/components/database/AudienceDetailView";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import BrandOrbLogo from "@/components/ui/brand-orb-logo";
import { cn } from "@/lib/utils";
import { OnboardingEnrichmentInputs } from "./OnboardingEnrichmentInputs";
import { ForgingPanel, type ForgingStage } from "./ForgingPanel";
import { ProductInputPhase, type ExtractedProduct } from "./ProductInputPhase";
import { FieldReviewPhase } from "./FieldReviewPhase";
import type { AudienceDraft } from "./AudienceConfirmPhase";
import type { BrandDraft } from "./BrandConfirmPhase";

type Phase = "product" | "review" | "connect" | "forging" | "naming" | "done";

const PHASE_STEPS: { key: Phase; label: string }[] = [
  { key: "product", label: "URL" },
  { key: "review", label: "Review" },
  { key: "connect", label: "Connect" },
  { key: "forging", label: "Forge" },
  { key: "naming", label: "Name" },
];

interface ChatOnboardingFlowProps {
  initialUrl?: string | null;
  onComplete: (agentName: string, brandId: string, transcript: { role: "user" | "assistant"; content: string }[]) => void;
}

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const ONBOARDING_STORAGE_KEY = "tw_onboarding_state_v1";

type PersistedOnboarding = {
  phase: Phase;
  extractedProduct: ExtractedProduct | null;
  targetUrl: string | null;
  confirmedAudiences: AudienceDraft[];
  confirmedBrand: BrandDraft | null;
  enrichInputsSummary: { fileCount: number; integrationCount: number };
  agentName: string;
  createdBrandId: string | null;
  createdBrandRowId: string | null;
  createdBrandName: string | null;
};

function loadPersistedOnboarding(): Partial<PersistedOnboarding> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedOnboarding>;
    // Don't rehydrate transient phases — bounce back to a safe step.
    if (parsed.phase === "forging") parsed.phase = "connect";
    if (parsed.phase === "done") return null;
    // If we restored "naming" but lost the created brand id (page was
    // reloaded mid-flow), bounce back to "connect" so forging re-runs and
    // the Continue button isn't a silent no-op.
    if (parsed.phase === "naming" && !parsed.createdBrandId) {
      parsed.phase = "connect";
    }
    return parsed;
  } catch { return null; }
}

export function ChatOnboardingFlow({ onComplete }: ChatOnboardingFlowProps) {
  const persisted = useRef<Partial<PersistedOnboarding> | null>(loadPersistedOnboarding()).current;

  const [phase, setPhase] = useState<Phase>(persisted?.phase ?? "product");

  // Collected data across phases
  const [extractedProduct, setExtractedProduct] = useState<ExtractedProduct | null>(persisted?.extractedProduct ?? null);
  const [targetUrl, setTargetUrl] = useState<string | null>(persisted?.targetUrl ?? null);
  const [confirmedAudiences, setConfirmedAudiences] = useState<AudienceDraft[]>(persisted?.confirmedAudiences ?? []);
  const [confirmedBrand, setConfirmedBrand] = useState<BrandDraft | null>(persisted?.confirmedBrand ?? null);
  const [enrichInputsSummary, setEnrichInputsSummary] = useState(persisted?.enrichInputsSummary ?? { fileCount: 0, integrationCount: 0 });

  // Forging state
  const [forgingStage, setForgingStage] = useState<ForgingStage>("ingesting");
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [createdBrandId, setCreatedBrandId] = useState<string | null>(null);
  const [createdBrandRowId, setCreatedBrandRowId] = useState<string | null>(null);
  const [createdBrandName, setCreatedBrandName] = useState<string | null>(null);

  // Naming state
  const [agentName, setAgentName] = useState(persisted?.agentName ?? "");
  const [isCompleting, setIsCompleting] = useState(false);

  // Persist onboarding progress so navigating away & back keeps the flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (phase === "done") { window.localStorage.removeItem(ONBOARDING_STORAGE_KEY); return; }
    try {
      const snapshot: PersistedOnboarding = {
        phase, extractedProduct, targetUrl, confirmedAudiences, confirmedBrand, enrichInputsSummary, agentName,
      };
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
  }, [phase, extractedProduct, targetUrl, confirmedAudiences, confirmedBrand, enrichInputsSummary, agentName]);

  // DNA context
  let contextAvailable = false;
  let reloadData: () => Promise<{ brands: BrandEntry[]; products: ProductEntry[]; audiences: AudienceEntry[] }> = async () => ({ brands: [], products: [], audiences: [] });
  let activeWorkspaceId: string | null = null;
  let setBrands: React.Dispatch<React.SetStateAction<BrandEntry[]>> = () => {};
  try { const ctx = useBusinessDNA(); reloadData = ctx.reloadData; activeWorkspaceId = ctx.activeWorkspaceId; setBrands = ctx.setBrands; contextAvailable = true; } catch {}

  // ── Phase handlers ──
  const handleProductComplete = useCallback((url: string) => {
    setTargetUrl(url);
    setPhase("review");
  }, []);

  const handleReviewComplete = useCallback((product: ExtractedProduct, audiences: AudienceDraft[], brand: BrandDraft) => {
    setExtractedProduct(product);
    setConfirmedAudiences(audiences);
    setConfirmedBrand(brand);
    setPhase("connect");
  }, []);

  // ── Forging logic ──
  const hasForgedRef = useRef(false);
  useEffect(() => {
    if (phase !== "forging") return;
    if (hasForgedRef.current) return;
    hasForgedRef.current = true;
    let cancelled = false;
    setPersistenceError(null);

    (async () => {
      if (!extractedProduct || !confirmedBrand) return;

      const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const brandId = `brand-${Date.now()}`;
      const brandName = confirmedBrand.name.trim() || "My Business";

      setForgingStage("ingesting");
      if (enrichInputsSummary.fileCount > 0 || enrichInputsSummary.integrationCount > 0) await sleep(300);
      setForgingStage("enriching");
      await sleep(280);
      setForgingStage("synthesizing");

      const newBrand: BrandEntry = {
        ...(confirmedBrand as any),
        id: brandId,
        name: brandName,
        category: confirmedBrand.category || extractedProduct.category || confirmedBrand.businessType,
        businessType: confirmedBrand.businessType,
        lastUpdated: now,
        logoUrls: confirmedBrand.logoUrls || [],
        selectedLogo: 0,
        colors: confirmedBrand.colors,
        typography: confirmedBrand.typography,
        visualIdentity: confirmedBrand.visualIdentity,
      } as BrandEntry;

      const newProducts: ProductEntry[] = [{
        ...DEFAULT_PRODUCT,
        ...(extractedProduct.rawProduct || {}),
        id: `product-${Date.now()}-0`,
        name: extractedProduct.name || `${brandName} Core Offer`,
        category: extractedProduct.category || confirmedBrand.businessType,
        description: extractedProduct.description || "",
        features: extractedProduct.features || [],
        benefits: extractedProduct.benefits || [],
        painPoints: extractedProduct.painPoints || [],
        useCases: extractedProduct.useCases || [],
        uniqueSellingPoints: extractedProduct.uniqueSellingPoints || [],
        offers: (extractedProduct.offers || []).map((o: any, i: number) => ({
          id: `offer-${Date.now()}-${i}`,
          title: o.title || "",
          originalPrice: o.originalPrice || "",
          salePrice: o.salePrice || "",
          discount: o.discount || "",
          bundleDetails: o.bundleDetails || "",
          freeGifts: o.freeGifts || [],
          isPopular: o.isPopular || false,
        })),
        images: (extractedProduct.images || []).slice(0, 8).map((url: string, i: number) => ({
          id: `img-${Date.now()}-${i}`,
          url,
          label: `Product Image ${i + 1}`,
        })),
        brandId,
        lastUpdated: now,
      }];

      const newAudiences: AudienceEntry[] = confirmedAudiences.map((a, i) => ({
        ...DEFAULT_AUDIENCE,
        ...(a as any),
        id: `audience-${Date.now()}-${i}`,
        name: a.name || `Audience ${i + 1}`,
        description: a.description || "",
        buyingTriggers: a.buyingTriggers || [],
        valuePropositions: a.valuePropositions || [],
        brandId,
        lastUpdated: now,
      } as AudienceEntry));

      const { data: saveData, error: saveError } = await supabase.functions.invoke("save-onboarding", {
        body: {
          brandData: newBrand,
          productsData: newProducts,
          audiencesData: newAudiences,
          workspaceId: activeWorkspaceId || localStorage.getItem("preferred_workspace_id") || undefined,
          brandName,
        },
      });

      if (cancelled) return;
      if (saveError || !saveData?.success) {
        setPersistenceError(saveData?.error || "Failed to save. Please try again.");
        hasForgedRef.current = false;
        return;
      }

      setForgingStage("saving");
      await sleep(180);

      if (saveData.workspaceId) localStorage.setItem("preferred_workspace_id", saveData.workspaceId);
      const savedBrandRowId = typeof saveData.brandRowId === "string" ? saveData.brandRowId : null;
      let reloadedBrands: any[] = [];
      if (contextAvailable) { const result = await reloadData(); reloadedBrands = result.brands; }

      setCreatedBrandId(brandId);
      setCreatedBrandRowId(savedBrandRowId || reloadedBrands.find((br: any) => br.id === brandId)?._rowId || null);
      setCreatedBrandName(newBrand.name);

      if (contextAvailable) {
        let rowId: string | undefined = savedBrandRowId || undefined;
        if (!rowId) {
          for (let attempt = 0; attempt < 3; attempt++) {
            const brandRow = reloadedBrands.find((bb: any) => bb.id === brandId);
            rowId = (brandRow as any)?._rowId;
            if (rowId) break;
            await new Promise(r => setTimeout(r, 1000));
            const retryResult = await reloadData();
            reloadedBrands = retryResult.brands;
          }
        }
        if (rowId) {
          invokeEdgeFunction("enrich-pillars", {
            brandId,
            brandRowId: rowId,
            workspaceId: saveData.workspaceId || null,
          }).catch(() => {});
        }
      }

      setForgingStage("done");
      setTimeout(() => { if (!cancelled) setPhase("naming"); }, 400);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Naming handler ──
  const handleFinishNaming = useCallback(async () => {
    const trimmed = agentName.trim();
    if (!trimmed || !createdBrandId) return;
    setIsCompleting(true);
    try {
      const targetRowId = createdBrandRowId || createdBrandId;
      const { data: existing } = await supabase.from("user_business_data").select("content").eq("id", targetRowId).maybeSingle();
      const brandData = JSON.parse((existing as any)?.content || "{}");
      brandData.agentName = trimmed;
      await supabase.from("user_business_data").update({ content: JSON.stringify(brandData) }).eq("id", targetRowId);
      setBrands(prev => prev.map(b => ((b as any)._rowId === targetRowId || b.id === createdBrandId) ? { ...b, agentName: trimmed } : b));
    } catch {}
    setIsCompleting(false);
    setPhase("done");
    onComplete(trimmed, createdBrandId, [
      { role: "assistant", content: "What do you sell?" },
      { role: "user", content: extractedProduct?.name || "My product" },
      { role: "assistant", content: `Product: ${extractedProduct?.name}. Audience: ${confirmedAudiences.map(a => a.name).join(", ")}. Brand: ${confirmedBrand?.name}.` },
      { role: "assistant", content: "Business DNA forged from real data." },
    ]);
  }, [agentName, createdBrandId, createdBrandRowId, setBrands, onComplete, extractedProduct, confirmedAudiences, confirmedBrand]);

  // ── Progress bar index ──
  const currentStepIdx = PHASE_STEPS.findIndex(s => s.key === phase);

  // ── Render ──
  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-1 mb-4"
        >
          {PHASE_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300",
                i < currentStepIdx
                  ? "bg-primary text-white shadow-sm"
                  : i === currentStepIdx
                  ? "bg-primary/15 text-primary border-2 border-primary/40 shadow-sm"
                  : "bg-muted text-muted-foreground/50",
              )}>
                {i + 1}
              </div>
              {i < PHASE_STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-[2px] rounded-full transition-all duration-500",
                  i < currentStepIdx ? "bg-primary" : "bg-border",
                )} />
              )}
            </div>
          ))}
        </motion.div>

        {/* Welcome */}
        <AssistantBubble>
          <p className="text-[15px] font-bold text-foreground">Welcome</p>
          <p className="text-[14px] text-foreground">
            Let's build your Business DNA from real data — starting with what you sell.
          </p>
        </AssistantBubble>

        {/* Phase 1: Product URL */}
        {phase === "product" && (
          <UserActionCard wide>
            <ProductInputPhase onComplete={handleProductComplete} />
          </UserActionCard>
        )}

        {/* Phase 2: Field Review */}
        {phase === "review" && targetUrl && (
          <>
            <AssistantBubble>
              <p className="text-[14px] text-foreground">
                We're analyzing <strong>{targetUrl}</strong> to give you your unfair advantage.
              </p>
            </AssistantBubble>
            <UserActionCard wide>
              <FieldReviewPhase
                targetUrl={targetUrl}
                onComplete={handleReviewComplete}
              />
            </UserActionCard>
          </>
        )}

        {/* Phase 3: Connect tools */}
        {phase === "connect" && (
          <>
            <AssistantBubble>
              <p className="text-[14px] text-foreground">
                Your identity is set: <strong>{confirmedBrand?.name}</strong> selling to{" "}
                <strong>{confirmedAudiences.map(a => a.name).join(", ")}</strong>.
              </p>
              <p className="text-[13px] text-muted-foreground mt-1">
                For better results, connect your tools below. Each one fills specific DNA fields with real data.
              </p>
            </AssistantBubble>
            <UserActionCard wide>
              <OnboardingEnrichmentInputs
                onContinue={(summary) => { setEnrichInputsSummary(summary); setPhase("forging"); }}
                onSkip={() => { setEnrichInputsSummary({ fileCount: 0, integrationCount: 0 }); setPhase("forging"); }}
              />
            </UserActionCard>
          </>
        )}

        {/* Phase 4: Forging */}
        {phase === "forging" && (
          <AssistantBubble>
            <ForgingPanel
              stage={forgingStage}
              fileCount={enrichInputsSummary.fileCount}
              integrationCount={enrichInputsSummary.integrationCount}
              url={extractedProduct?.sourceUrl}
              error={persistenceError}
              onRetry={() => { hasForgedRef.current = false; setPhase("forging"); }}
            />
          </AssistantBubble>
        )}

        {/* Phase 5: Name agent */}
        {phase === "naming" && (
          <>
            <AssistantBubble>
              <div className="flex items-center gap-3 mb-2">
                <BrandOrbLogo logoUrl={confirmedBrand?.logoUrls?.[0] || null} brandName={createdBrandName} size={36} />
                <p className="text-[14px] text-foreground">
                  Done — your Business DNA is grounded in real data. What should I call your AI agent?
                </p>
              </div>
            </AssistantBubble>
            <UserActionCard>
              <AnimatePresence mode="wait">
                {!isCompleting ? (
                  <motion.div
                    key="name-input"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-muted border-[1.5px] border-primary rounded-2xl p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-1">
                        <WandSparkles className="w-5 h-5 text-primary" strokeWidth={2} />
                      </div>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && agentName.trim()) handleFinishNaming(); }}
                        className="flex-1 bg-transparent border-none outline-none text-foreground text-[16px] sm:text-[15px]"
                        placeholder="e.g. Nova"
                        autoFocus
                      />
                      <button
                        onClick={handleFinishNaming}
                        disabled={!agentName.trim()}
                        className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]"
                      >
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="going" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-primary text-sm py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving {agentName.trim()}…
                  </motion.div>
                )}
              </AnimatePresence>
            </UserActionCard>
          </>
        )}
      </div>
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0">
        <BusinessBrainOrb size={36} />
      </div>
      <div className="flex-1 min-w-0 bg-card/80 backdrop-blur-sm border border-border/40 rounded-3xl rounded-tl-lg p-5 shadow-sm">
        {children}
      </div>
    </motion.div>
  );
}

function UserActionCard({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className={cn("ml-12", wide ? "" : "")}>
      {children}
    </motion.div>
  );
}
