import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Telescope, Dna, ArrowRight, Globe, Sparkles, Check, AlertCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeWithTimeout";
import { useBusinessDNA, BrandEntry, ProductEntry, AudienceEntry } from "./BusinessDNAContext";
import { DEFAULT_PRODUCT } from "./ProductDetailView";
import { DEFAULT_AUDIENCE } from "./AudienceDetailView";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { Typewriter } from "@/components/ui/typewriter";

const URL_EXAMPLES = [
  "tesla.com",
  "nike.com",
  "apple.com",
  "dyson.com",
  "allbirds.com",
  "glossier.com",
  "notion.so",
  "figma.com",
];

// Milestones that flip through during analysis
const ANALYSIS_MILESTONES = [
  "Resolving workspace",
  "Connecting to website",
  "Scraping homepage content",
  "Analyzing page structure",
  "Extracting brand identity",
  "Identifying product data",
  "Mapping audience signals",
  "Processing visual assets",
  "Building brand profile",
  "Structuring product data",
];

function getActualSources(url: string): string[] {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname;
    const sources = [host];
    if (path && path !== "/") {
      sources.push(`${host}${path}`);
    }
    return sources;
  } catch {
    return [url];
  }
}

/** Wait for a valid authenticated session (just needs a token for the edge function). */
async function waitForSession(maxAttempts = 6, delayMs = 1500): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch { /* ignore */ }
    if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}

interface BusinessDNAOnboardingProps {
  productUrl?: string | null;
  onComplete: (agentName: string, brandId?: string) => void;
  /** When true, skips agent naming (step 3) and auto-completes after persistence */
  isAddBusiness?: boolean;
  /** Existing brand ID to link products to (add-business mode) */
  activeBrandId?: string | null;
  /** Called when user presses back in add-business mode */
  onBack?: () => void;
}

export function BusinessDNAOnboarding({ productUrl: initialUrl, onComplete, isAddBusiness, activeBrandId, onBack }: BusinessDNAOnboardingProps) {
  const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl || null);
  const [urlInput, setUrlInput] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [step, setStep] = useState(initialUrl ? 1 : 0);
  const [agentName, setAgentName] = useState("");
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [progress, setProgress] = useState(0);

  // Flipping current task display — single line only
  const [currentMilestone, setCurrentMilestone] = useState(0);

  // Scanned sources tracking
  const [scannedSources, setScannedSources] = useState<string[]>([]);
  const [allSourcesDone, setAllSourcesDone] = useState(false);

  // Scrape state
  const scrapeResult = useRef<any>(null);
  const [scrapeComplete, setScrapeComplete] = useState(false);
  const [scrapeError, setScrapeError] = useState(false);
  const [createdBrandId, setCreatedBrandId] = useState<string | undefined>();
  const [persistenceComplete, setPersistenceComplete] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const workspaceIdRef = useRef<string | null>(null);
  

  // Refs for progress animation to avoid stale closures
  const scrapeCompleteRef = useRef(false);
  const persistenceCompleteRef = useRef(false);
  const progressRef = useRef(0); // tracks real progress value for phase transitions
  useEffect(() => { scrapeCompleteRef.current = scrapeComplete; }, [scrapeComplete]);
  useEffect(() => { persistenceCompleteRef.current = persistenceComplete; }, [persistenceComplete]);

  // Get context setters
  let contextAvailable = false;
  let reloadData: () => Promise<{ brands: BrandEntry[]; products: ProductEntry[]; audiences: AudienceEntry[] }> = async () => ({ brands: [], products: [], audiences: [] });
  let brands: BrandEntry[] = [];
  let refreshBrand: ((brandId: string) => Promise<void>) | null = null;
  try {
    const ctx = useBusinessDNA();
    reloadData = ctx.reloadData;
    brands = ctx.brands;
    refreshBrand = ctx.refreshBrand;
    contextAvailable = true;
  } catch {
    // No provider
  }

  const allSources = activeUrl ? getActualSources(activeUrl) : [];

  // URL placeholder rotation for step 0
  useEffect(() => {
    if (step !== 0 || urlInput) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % URL_EXAMPLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [step, urlInput]);

  // Flip through milestones during steps 1-2 — single line only, no history
  useEffect(() => {
    if (step < 1 || step >= 3 || persistenceComplete) return;
    const interval = setInterval(() => {
      setCurrentMilestone(prev => {
        const next = prev + 1;
        if (next >= ANALYSIS_MILESTONES.length) return prev;
        return next;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [step, persistenceComplete]);

  // Step 1: Fire scrape-product
  useEffect(() => {
    if (step < 1 || !activeUrl) return;
    let cancelled = false;
    (async () => {
      try {
        // Wait for auth session to settle (critical for new signups)
        const token = await waitForSession();
        if (!token) {
          if (!cancelled) {
            setScrapeError(true);
            setScrapeComplete(true);
            setPersistenceError("Authentication failed. Please refresh and try again.");
          }
          return;
        }

        // Don't trust localStorage — let the edge function resolve workspace server-side
        workspaceIdRef.current = null;

        // Start scrape
        if (!cancelled) setScannedSources([allSources[0]]);

        const { data, error } = await invokeEdgeFunction("scrape-product", { url: activeUrl.trim(), mode: "core" });

        if (!cancelled) {
          setScannedSources([...allSources]);
          setAllSourcesDone(true);
        }

        if (cancelled) return;
        if (error || !data?.success) {
          console.error("Scrape failed:", error || data?.error);
          setScrapeError(true);
        } else {
          scrapeResult.current = data.extracted;
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Scrape error:", e);
          setScrapeError(true);
        }
      } finally {
        if (!cancelled) setScrapeComplete(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activeUrl, step]);

  // Source accumulation
  useEffect(() => {
    if (step < 1 || step >= 3 || allSources.length <= 1 || allSourcesDone) return;
    const timer = setTimeout(() => {
      if (allSources.length > 1) {
        setScannedSources(prev => {
          if (prev.length < allSources.length) return [...prev, allSources[prev.length]];
          return prev;
        });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [step, allSources.length, allSourcesDone]);

  // Progress animation — instantly jumps to 80%, then animates 80→100%
  useEffect(() => {
    if (step < 1 || step > 2) return;

    // Instant jump to 80%
    if (progressRef.current < 80) {
      progressRef.current = 80;
      setProgress(80);
    }

    let rafId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (persistenceCompleteRef.current) {
        // Quickly animate to 100
        const next = progressRef.current + (100 - progressRef.current) * 0.15;
        progressRef.current = next >= 99.5 ? 100 : next;
        setProgress(progressRef.current);
        if (progressRef.current < 100) {
          rafId = requestAnimationFrame(tick);
        }
        return;
      }

      // Asymptotic approach from 80→95 (scraping) or 95→99 (persisting)
      const ceiling = scrapeCompleteRef.current ? 95 : 90;
      const remaining = ceiling - progressRef.current;
      const speed = Math.max(0.05, remaining * 0.02);
      const next = Math.min(ceiling - 0.1, progressRef.current + speed * dt);

      progressRef.current = next;
      setProgress(next);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [step]);

  // Transition from step 1 → 2 ONLY if scrape succeeded (not on error)
  useEffect(() => {
    if (step === 1 && scrapeComplete && !scrapeError) {
      const timeout = setTimeout(() => {
        setStep(2);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [step, scrapeComplete, scrapeError]);

  // Step 2: persist via edge function (bypasses RLS with service role)
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;

    (async () => {
      const extracted = scrapeResult.current || {};
      const now = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const brandId = `brand-${Date.now()}`;

      // Build brand (always single)
      const b = extracted.brand || {};
      const fallbackName = (() => {
        try {
          const u = new URL(activeUrl!.trim().startsWith("http") ? activeUrl!.trim() : `https://${activeUrl!.trim()}`);
          return u.hostname.replace(/^www\./, "").split(".")[0];
        } catch { return null; }
      })();
      const brandName = b.name || extracted.products?.[0]?.name || extracted.product?.name || fallbackName || "My Business";
      const newBrand: BrandEntry = {
        id: brandId,
        name: brandName,
        category: b.category || "Brand",
        lastUpdated: now,
        colors: b.colors || undefined,
        typography: b.typography || undefined,
        logoUrls: Array.isArray(b.logoUrls) ? b.logoUrls : [],
        selectedLogo: 0,
        visualIdentity: b.visualIdentity || undefined,
      };

      // Build products array
      const productsRaw = extracted.products || (extracted.product ? [extracted.product] : []);
      const newProducts: ProductEntry[] = productsRaw.slice(0, 5).map((p: any, i: number) => ({
        ...DEFAULT_PRODUCT,
        id: `product-${Date.now()}-${i}`,
        name: p.name || `Imported Product ${i + 1}`,
        category: p.category || "Consumer Product",
        description: p.description || "",
        features: p.features || [],
        benefits: p.benefits || [],
        painPoints: p.painPoints || [],
        useCases: p.useCases || [],
        targetScenarios: p.targetScenarios || [],
        positioningStatement: p.positioningStatement || "",
        uniqueSellingPoints: p.uniqueSellingPoints || [],
        competitiveAdvantages: p.competitiveAdvantages || [],
        commonObjections: p.commonObjections?.length
          ? p.commonObjections.map((o: any) => ({ objection: o.objection || "", response: o.response || "" }))
          : [],
        proofPoints: p.proofPoints?.length
          ? p.proofPoints.map((pp: any) => ({ category: pp.category || "", items: pp.items || [] }))
          : [],
        dosAndDonts: {
          dos: p.dosAndDonts?.dos || [],
          donts: p.dosAndDonts?.donts || [],
        },
        powerPhrases: p.powerPhrases || [],
        powerWords: p.powerWords || [],
        technicalLevel: p.technicalLevel || "",
        refinementChecklist: p.refinementChecklist || [],
        images: p.images?.length
          ? p.images.map((imgUrl: string, j: number) => ({
              id: `img-${j + 1}`,
              url: imgUrl,
              label: `Product Image ${j + 1}`,
            }))
          : DEFAULT_PRODUCT.images,
        offers: p.offers?.length
          ? p.offers.map((o: any, j: number) => ({
              id: `offer-${j + 1}`,
              title: o.title || `Offer ${j + 1}`,
              originalPrice: o.originalPrice || "",
              salePrice: o.salePrice || "",
              discount: o.discount || "",
              bundleDetails: o.bundleDetails || "",
              freeGifts: o.freeGifts || [],
              isPopular: o.isPopular || false,
            }))
          : DEFAULT_PRODUCT.offers,
        lastUpdated: now,
        brandId: isAddBusiness && activeBrandId ? activeBrandId : brandId,
      }));

      // Build audiences array
      const audiencesRaw = extracted.audiences || (extracted.audience ? [extracted.audience] : []);
      const newAudiences: AudienceEntry[] = audiencesRaw
        .filter((a: any) => a?.name)
        .slice(0, 5)
        .map((a: any, i: number) => ({
          ...DEFAULT_AUDIENCE,
          id: `audience-${Date.now()}-${i}`,
          name: a.name,
          description: a.description || "",
          buyingTriggers: a.buyingTriggers || [],
          useCaseRequirements: a.useCaseRequirements || [],
          keySuccessIndicators: a.keySuccessIndicators || [],
          additionalCharacteristics: a.additionalCharacteristics || "",
          positioningStatement: a.positioningStatement || "",
          valuePropositions: a.valuePropositions || [],
          engagementTriggers: a.engagementTriggers || [],
          attentionHooks: a.attentionHooks || [],
          commonObjections: a.commonObjections?.length
            ? a.commonObjections.map((o: any) => ({ objection: o.objection || "", response: o.response || "" }))
            : [],
          proofPoints: a.proofPoints?.length
            ? a.proofPoints.map((pp: any) => ({ category: pp.category || "", items: pp.items || [] }))
            : [],
          dosAndDonts: {
            dos: a.dosAndDonts?.dos || [],
            donts: a.dosAndDonts?.donts || [],
          },
          powerPhrases: a.powerPhrases || [],
          powerWords: a.powerWords || [],
          technicalLevel: a.technicalLevel || "",
          refinementChecklist: a.refinementChecklist || [],
          lastUpdated: now,
          productIds: newProducts[i] ? [newProducts[i].id] : [],
        }));

      if (cancelled) return;

      // Call edge function — pass arrays
      const { data, error } = await supabase.functions.invoke("save-onboarding", {
        body: {
          brandData: newBrand,
          productsData: newProducts,
          audiencesData: newAudiences,
          brandName,
        },
      });

      if (cancelled) return;

      if (error || !data?.success) {
        console.error("save-onboarding failed:", error || data?.error);
        setPersistenceError(data?.error || "Failed to save brand. Please try again.");
        return;
      }

      // Store workspace ID from response
      if (data.workspaceId) {
        localStorage.setItem("preferred_workspace_id", data.workspaceId);
      }

      // Reload from DB to get proper _rowId values and avoid duplicate insertions
      let reloadedBrands: any[] = [];
      if (contextAvailable) {
        const result = await reloadData();
        reloadedBrands = result.brands;
      }

      const finalBrandId = isAddBusiness && activeBrandId ? activeBrandId : brandId;
      setCreatedBrandId(finalBrandId);
      setPersistenceComplete(true);

      // Fire-and-forget: enrich brand with heavy assets (moodboard, illustrations, screenshot)
      if (contextAvailable) {
        let rowId: string | undefined;
        // Try to find the brand row, with retry for race conditions
        for (let attempt = 0; attempt < 3; attempt++) {
          const brandRow = reloadedBrands.find((b: any) => b.id === finalBrandId);
          rowId = (brandRow as any)?._rowId;
          if (rowId) break;
          console.log(`Enrich-brand: rowId not found, retry ${attempt + 1}/3...`);
          await new Promise(r => setTimeout(r, 1500));
          const retryResult = await reloadData();
          reloadedBrands = retryResult.brands;
        }
        console.log("Enrich-brand: rowId:", rowId);
        if (rowId) {
          const firstProduct = productsRaw[0] || {};
          const firstAudience = audiencesRaw[0] || {};
          invokeEdgeFunction("enrich-brand", {
            brandRowId: rowId,
            brandName,
            brandCategory: b.category || "lifestyle",
            brandColors: b.colors || {},
            audienceDesc: firstAudience.description || "",
            audiencePowerWords: (firstAudience.powerWords || []).slice(0, 5).join(", "),
            productBenefits: (firstProduct.benefits || []).slice(0, 6).join("; "),
            buyingTriggers: (firstAudience.buyingTriggers || []).slice(0, 4).join("; "),
            websiteUrl: activeUrl || "",
          }).then((res) => {
            console.log("Brand enrichment result:", res.data);
            if (res.data?.success && refreshBrand) {
              refreshBrand(finalBrandId);
            }
          }).catch((e) => console.warn("Brand enrichment failed (non-blocking):", e));
        }
      }

      if (!cancelled) {
        // Always show step 3 for agent naming
        setTimeout(() => setStep(3), 800);
      }
    })();

    return () => { cancelled = true; };
  }, [step]);

  // Retry handler for persistence errors
  const handleRetry = useCallback(() => {
    setPersistenceError(null);
    setScrapeComplete(false);
    setScrapeError(false);
    setProgress(0);
    progressRef.current = 0;
    setCurrentMilestone(0);
    setScannedSources([]);
    setAllSourcesDone(false);
    setStep(1);
  }, []);

  const visibleSources = scannedSources.slice(-5);
  const currentTask = ANALYSIS_MILESTONES[currentMilestone];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-2 sm:p-4 font-sans overflow-hidden relative">
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top 3-bump progress bar */}
      {step >= 1 && (
        <div className="absolute top-0 left-0 w-full p-4 sm:p-8 flex justify-center z-50">
          <div className="flex items-center gap-2 sm:gap-3 bg-card border border-border shadow-sm rounded-full px-4 sm:px-5 py-2.5 sm:py-3">
            {[1, 2, 3].map((i, index) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3">
                <motion.div
                  layout
                  className={`rounded-full transition-all duration-500 ${
                    step === i
                      ? "w-8 sm:w-10 h-2 sm:h-2.5 bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                      : step > i
                        ? "w-2 sm:w-2.5 h-2 sm:h-2.5 bg-primary"
                        : "w-2 sm:w-2.5 h-2 sm:h-2.5 bg-muted"
                  }`}
                />
                {index < 2 && (
                  <div
                    className={`h-[2px] w-6 sm:w-12 transition-colors duration-500 ${
                      step > i ? "bg-primary/50" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header & Progress — steps 1-2 only */}
      {step >= 1 && step < 3 && (
        <div className="flex flex-col items-center mb-4 sm:mb-8 mt-14 sm:mt-12">
          <AnimatePresence mode="wait">
            <motion.h1
              key={`title-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xl sm:text-3xl font-extrabold mb-4 sm:mb-6 tracking-tight text-center onboarding-text-shine"
            >
              {step === 1 ? "Researching your business" : "Setting up your business"}
            </motion.h1>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center w-64 sm:w-80 mt-1 sm:mt-2"
          >
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.round(progress)}%` }}
                transition={{ duration: 0.3, ease: "linear" }}
              />
            </div>
            <div className="flex justify-end w-full px-1">
              <p className="text-sm font-bold text-primary">{Math.round(progress)}%</p>
            </div>
          </motion.div>
        </div>
      )}

      <div className="max-w-5xl w-full relative z-10 px-2 sm:px-4">
        <AnimatePresence mode="wait">
          {/* Step 0: URL Input */}
          {step === 0 && (
            <motion.div
              key="url-input"
              className="w-full max-w-2xl mx-auto text-center space-y-8 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              {/* Back button for add-business mode */}
              {isAddBusiness && onBack && (
                <button
                  onClick={onBack}
                  className="absolute -top-2 left-0 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Back
                </button>
              )}
              <div className="space-y-2 sm:space-y-3 py-2 sm:py-4">
                <div className="mx-auto h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 sm:mb-4">
                  <Globe className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Enter your company URL
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                  We'll analyze your website and build your Business DNA automatically.
                </p>
              </div>

              <div className="rounded-2xl bg-muted/40 border border-border/40 p-2.5 sm:p-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary/70" />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && urlInput.trim()) {
                          setActiveUrl(urlInput.trim());
                          setStep(1);
                        }
                      }}
                      className="w-full h-10 sm:h-12 text-sm sm:text-base border-0 bg-transparent focus:outline-none text-foreground px-2 sm:px-3"
                      autoFocus
                    />
                    {!urlInput && (
                      <div className="absolute inset-0 flex items-center pointer-events-none pl-2 sm:pl-3">
                        <Typewriter
                          text={URL_EXAMPLES}
                          speed={60}
                          deleteSpeed={30}
                          waitTime={1500}
                          loop
                          className="text-sm sm:text-base text-muted-foreground/40 truncate"
                          showCursor
                          cursorChar="|"
                          cursorClassName="ml-0.5 text-muted-foreground/30"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (urlInput.trim()) {
                        setActiveUrl(urlInput.trim());
                        setStep(1);
                      }
                    }}
                    disabled={!urlInput.trim()}
                    className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl bg-primary/80 hover:bg-primary text-primary-foreground font-medium text-sm sm:text-base flex items-center gap-2 disabled:opacity-50 transition-all shrink-0"
                  >
                    <span className="hidden sm:inline">Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 ml-1">
                  <Sparkles className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground/60">
                    Paste your company url
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {step >= 1 && step < 3 && (
            <motion.div
              key="analyzing-container"
              className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full items-stretch justify-center mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              {/* Left Card — Flipping Task Display */}
              <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-2xl shadow-primary/10 p-5 sm:p-10 md:p-14 flex flex-col items-center justify-center w-full md:w-1/2">
                <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-8 relative">
                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.div
                        key="search"
                        initial={{ scale: 0, opacity: 0, rotate: -90 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="absolute"
                      >
                        <Telescope className="w-8 h-8 sm:w-14 sm:h-14 text-primary" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="dna"
                        initial={{ scale: 0, opacity: 0, rotate: -90 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="absolute"
                      >
                        <Dna className="w-8 h-8 sm:w-14 sm:h-14 text-primary" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="text-xs sm:text-sm font-bold tracking-widest text-muted-foreground mb-2 sm:mb-4 uppercase">
                  STEP {step} OF 3
                </div>

                <h2 className="text-base sm:text-xl font-bold text-foreground text-center tracking-tight mb-2 sm:mb-3">
                  {step === 1 ? "Analyzing your business" : "Forging your business DNA"}
                </h2>

                {/* Persistence error state */}
                {persistenceError ? (
                  <div className="flex flex-col items-center gap-3 w-full mt-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{persistenceError}</span>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Try Again
                    </button>
                  </div>
                ) : (
                  /* Single flipping current task — no history stack */
                  <div className="flex flex-col items-center justify-center w-full min-h-[40px] sm:min-h-[60px] mt-1 sm:mt-2">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentTask}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.35 }}
                        className="flex items-center gap-2 text-xs sm:text-sm"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        <span className="text-foreground font-medium">{currentTask}</span>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Right Card: Sources */}
              <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-2xl shadow-primary/10 p-5 sm:p-8 md:p-10 flex flex-col items-start justify-start w-full md:w-1/2">
                <div className="mb-4 sm:mb-6">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>

                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="text-xs sm:text-sm font-bold tracking-widest text-foreground uppercase">
                    Scanning Sources
                  </div>
                  {!allSourcesDone && (
                    <div className="flex gap-1">
                      <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} />
                      <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} />
                      <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full min-h-[80px] sm:min-h-[140px]">
                  <AnimatePresence>
                    {visibleSources.map((source, i) => {
                      const isLatest = i === visibleSources.length - 1 && !allSourcesDone;
                      return (
                        <motion.div
                          key={source}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: isLatest ? 1 : 0.5, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-2 text-xs sm:text-sm"
                        >
                          {isLatest ? (
                            <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                              <motion.div
                                className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                            </div>
                          ) : (
                            <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <Check className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-primary" />
                            </div>
                          )}
                          <span className={`truncate ${isLatest ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            https://{source}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="mt-auto pt-3 sm:pt-4 border-t border-border/50 w-full">
                  <p className="text-xs text-muted-foreground/60">
                    {scannedSources.length} of {allSources.length} sources scanned
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="result-card"
              className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center px-2"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
            >
              {/* Business Brain Orb */}
              <div className="mb-8 sm:mb-12 mt-2 sm:mt-4">
                <BusinessBrainOrb size={120} className="sm:hidden" />
                <BusinessBrainOrb size={160} className="hidden sm:flex" />
              </div>

              {/* Agent Name Input */}
              <div className="w-full flex flex-col items-center min-h-[100px] sm:min-h-[120px] justify-center">
                <AnimatePresence mode="wait">
                  {!isNameSubmitted ? (
                    <motion.div
                      key="input-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full"
                    >
                      <label
                        htmlFor="agentName"
                        className="flex items-center justify-center text-xs sm:text-sm font-bold text-muted-foreground mb-3 sm:mb-4 uppercase tracking-wide"
                      >
                        Agent Name
                      </label>
                      <input
                        id="agentName"
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && agentName.trim().length > 0) {
                            setIsNameSubmitted(true);
                          }
                        }}
                        placeholder=""
                        className="w-full px-4 sm:px-5 py-3 sm:py-4 text-center text-base sm:text-lg bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none text-foreground font-medium shadow-sm"
                        autoFocus
                      />
                      <AnimatePresence>
                        {agentName.trim().length > 0 && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-center text-xs text-muted-foreground mt-2 sm:mt-3"
                          >
                            Press Enter to continue
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="button-view"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="w-full flex flex-col items-center"
                    >
                      <button
                        onClick={async () => {
                          // Persist agent name to the brand record
                          if (createdBrandId && agentName.trim()) {
                            try {
                              const { data: existing } = await supabase
                                .from("user_business_data")
                                .select("content")
                                .eq("id", createdBrandId)
                                .single();
                              const brandData = JSON.parse(existing?.content || "{}");
                              brandData.agentName = agentName.trim();
                              await supabase
                                .from("user_business_data")
                                .update({ content: JSON.stringify(brandData) })
                                .eq("id", createdBrandId);
                            } catch { /* best effort */ }
                          }
                          onComplete(agentName.trim(), createdBrandId);
                        }}
                        className="w-full bg-card border border-border shadow-sm text-foreground hover:bg-muted px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        Take Me To {agentName.trim()}
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
