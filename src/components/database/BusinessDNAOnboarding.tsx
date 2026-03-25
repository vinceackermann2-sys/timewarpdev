import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Telescope, Dna, ArrowRight, Globe, Sparkles, Check, AlertCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessDNA, BrandEntry, ProductEntry, AudienceEntry } from "./BusinessDNAContext";
import { DEFAULT_PRODUCT } from "./ProductDetailView";
import { DEFAULT_AUDIENCE } from "./AudienceDetailView";

const URL_EXAMPLES = [
  "nike.com/air-max-90",
  "apple.com/iphone-16-pro",
  "tesla.com/model-3",
  "dyson.com/airwrap",
  "allbirds.com/tree-runners",
  "glossier.com/boy-brow",
  "notion.so/product",
  "figma.com/pricing",
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
}

export function BusinessDNAOnboarding({ productUrl: initialUrl, onComplete }: BusinessDNAOnboardingProps) {
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
  const resolvedUserIdRef = useRef<string | null>(null);

  // Refs for progress animation to avoid stale closures
  const scrapeCompleteRef = useRef(false);
  const persistenceCompleteRef = useRef(false);
  const progressRef = useRef(0); // tracks real progress value for phase transitions
  useEffect(() => { scrapeCompleteRef.current = scrapeComplete; }, [scrapeComplete]);
  useEffect(() => { persistenceCompleteRef.current = persistenceComplete; }, [persistenceComplete]);

  // Get context setters
  let contextAvailable = false;
  let setBrands: React.Dispatch<React.SetStateAction<BrandEntry[]>> = () => {};
  let setProducts: React.Dispatch<React.SetStateAction<ProductEntry[]>> = () => {};
  let setAudiences: React.Dispatch<React.SetStateAction<AudienceEntry[]>> = () => {};
  try {
    const ctx = useBusinessDNA();
    setBrands = ctx.setBrands;
    setProducts = ctx.setProducts;
    setAudiences = ctx.setAudiences;
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

        // Store workspace ID from localStorage if available
        workspaceIdRef.current = localStorage.getItem("preferred_workspace_id");

        // Start scrape
        if (!cancelled) setScannedSources([allSources[0]]);

        const { data, error } = await supabase.functions.invoke("scrape-product", {
          body: { url: activeUrl.trim() },
        });

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

  // Smooth progress animation using requestAnimationFrame with refs
  useEffect(() => {
    if (step < 1 || step > 2) return;
    const startTime = Date.now();
    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - startTime;

      if (persistenceCompleteRef.current) {
        progressRef.current = 100;
        setProgress(100);
        return; // stop RAF loop
      }

      let next: number;

      // Phase A: smooth ease to 75% over ~20s while scrape is running
      if (!scrapeCompleteRef.current) {
        const t = Math.min(elapsed / 20000, 1);
        const eased = 1 - Math.pow(1 - t, 3); // cubic deceleration
        next = Math.min(75, eased * 75);
      } else {
        // Phase B: scrape done, slowly crawl from current value toward 95
        // Use progressRef to avoid stale closure — always increment from real value
        next = Math.min(95, progressRef.current + 0.05);
      }

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

  // Step 2: create entries directly in DB with robust retry
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;

    (async () => {
      const wsId = workspaceIdRef.current;

      // If workspace wasn't resolved yet, try again
      if (!wsId && resolvedUserIdRef.current) {
        const retryWsId = await resolveWorkspaceId(resolvedUserIdRef.current);
        if (retryWsId) {
          workspaceIdRef.current = retryWsId;
        }
      }

      const finalWsId = workspaceIdRef.current;
      if (!finalWsId) {
        setPersistenceError("No workspace found. Please try again.");
        return;
      }

      // Get fresh session with forced refresh
      const sessionResult = await waitForSession(4, 2000);
      if (!sessionResult) {
        setPersistenceError("Not authenticated. Please sign in and try again.");
        return;
      }
      const userId = sessionResult.userId;

      const extracted = scrapeResult.current || {};
      const now = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const brandId = `brand-${Date.now()}`;
      const productId = `product-${Date.now()}`;
      const audienceId = `audience-${Date.now()}`;

      // Build brand
      const b = extracted.brand || {};
      const fallbackName = (() => {
        try {
          const u = new URL(activeUrl!.trim().startsWith("http") ? activeUrl!.trim() : `https://${activeUrl!.trim()}`);
          return u.hostname.replace(/^www\./, "").split(".")[0];
        } catch { return null; }
      })();
      const brandName = b.name || extracted.product?.name || fallbackName || "My Business";
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

      // Build product
      const p = extracted.product || {};
      const newProduct: ProductEntry = {
        ...DEFAULT_PRODUCT,
        id: productId,
        name: p.name || "Imported Product",
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
          ? p.images.map((imgUrl: string, i: number) => ({
              id: `img-${i + 1}`,
              url: imgUrl,
              label: `Product Image ${i + 1}`,
            }))
          : DEFAULT_PRODUCT.images,
        offers: p.offers?.length
          ? p.offers.map((o: any, i: number) => ({
              id: `offer-${i + 1}`,
              title: o.title || `Offer ${i + 1}`,
              originalPrice: o.originalPrice || "",
              salePrice: o.salePrice || "",
              discount: o.discount || "",
              bundleDetails: o.bundleDetails || "",
              freeGifts: o.freeGifts || [],
              isPopular: o.isPopular || false,
            }))
          : DEFAULT_PRODUCT.offers,
        lastUpdated: now,
        brandId: brandId,
      };

      // Build audience
      let newAudience: AudienceEntry | null = null;
      if (extracted.audience?.name) {
        const a = extracted.audience;
        newAudience = {
          ...DEFAULT_AUDIENCE,
          id: audienceId,
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
          productIds: [productId],
        };
      }

      if (cancelled) return;

      // Direct DB persistence with exponential backoff retry for RLS errors
      const MAX_INSERT_RETRIES = 4;

      async function insertWithRetry(payload: any, label: string): Promise<{ error: any }> {
        for (let attempt = 0; attempt < MAX_INSERT_RETRIES; attempt++) {
          // Force fresh session before each retry attempt
          if (attempt > 0) {
            console.log(`${label} retry attempt ${attempt + 1}...`);
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            try {
              const { data: refreshData } = await supabase.auth.refreshSession();
              if (refreshData?.session) {
                await supabase.auth.setSession({
                  access_token: refreshData.session.access_token,
                  refresh_token: refreshData.session.refresh_token,
                });
              }
            } catch {
              // best effort
            }
          }

          const { error } = await supabase.from("user_business_data").insert(payload);

          if (!error) return { error: null };

          const isRlsError = error.code === '42501' || error.message?.includes('row-level security');
          if (isRlsError && attempt < MAX_INSERT_RETRIES - 1) {
            console.warn(`${label} RLS error (attempt ${attempt + 1}) — will retry`);
            continue;
          }

          return { error };
        }
        return { error: new Error(`${label} failed after ${MAX_INSERT_RETRIES} attempts`) };
      }

      const basePayload = {
        user_id: userId,
        source: "business-dna" as const,
        is_analyzed: true,
        workspace_id: finalWsId,
      };

      // Brand insert (required)
      const { error: brandErr } = await insertWithRetry({
        ...basePayload,
        data_type: "brand",
        title: newBrand.name,
        content: JSON.stringify(newBrand),
      }, "Brand insert");

      if (brandErr) {
        console.error("Brand insert failed:", brandErr);
        if (!cancelled) setPersistenceError("Failed to save brand. Please try again.");
        return;
      }

      // Product insert (required)
      const { error: productErr } = await insertWithRetry({
        ...basePayload,
        data_type: "product",
        title: newProduct.name,
        content: JSON.stringify(newProduct),
      }, "Product insert");

      if (productErr) {
        console.error("Product insert failed:", productErr);
        if (!cancelled) setPersistenceError("Failed to save product. Please try again.");
        return;
      }

      // Audience insert (optional — only if data exists)
      if (newAudience) {
        const { error: audErr } = await insertWithRetry({
          ...basePayload,
          data_type: "audience",
          title: newAudience.name,
          content: JSON.stringify(newAudience),
        }, "Audience insert");

        if (audErr) {
          console.error("Audience insert failed:", audErr);
          // Non-fatal, continue
        }
      }

      if (cancelled) return;

      // Rename workspace — wrapped in try/catch to handle 409 conflicts
      try {
        await supabase.from("workspaces").update({ name: brandName }).eq("id", finalWsId);
      } catch (wsErr) {
        console.warn("Workspace rename failed (non-fatal):", wsErr);
      }

      // Update context for immediate UI hydration
      if (contextAvailable) {
        setBrands(prev => [...prev, newBrand]);
        setProducts(prev => [...prev, newProduct]);
        if (newAudience) setAudiences(prev => [...prev, newAudience]);
      }

      setCreatedBrandId(brandId);
      setPersistenceComplete(true);

      if (!cancelled) {
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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-sans overflow-hidden relative">
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top 3-bump progress bar */}
      {step >= 1 && (
        <div className="absolute top-0 left-0 w-full p-8 flex justify-center z-50">
          <div className="flex items-center gap-3 bg-card border border-border shadow-sm rounded-full px-5 py-3">
            {[1, 2, 3].map((i, index) => (
              <div key={i} className="flex items-center gap-3">
                <motion.div
                  layout
                  className={`rounded-full transition-all duration-500 ${
                    step === i
                      ? "w-10 h-2.5 bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                      : step > i
                        ? "w-2.5 h-2.5 bg-primary"
                        : "w-2.5 h-2.5 bg-muted"
                  }`}
                />
                {index < 2 && (
                  <div
                    className={`h-[2px] w-8 sm:w-12 transition-colors duration-500 ${
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
        <div className="flex flex-col items-center mb-8 mt-12">
          <AnimatePresence mode="wait">
            <motion.h1
              key={`title-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl sm:text-3xl font-extrabold mb-6 tracking-tight text-center onboarding-text-shine"
            >
              {step === 1 ? "Researching your business" : "Setting up your business"}
            </motion.h1>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center w-80 mt-2"
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

      <div className="max-w-5xl w-full relative z-10 px-4">
        <AnimatePresence mode="wait">
          {/* Step 0: URL Input */}
          {step === 0 && (
            <motion.div
              key="url-input"
              className="w-full max-w-2xl mx-auto text-center space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <div className="space-y-3 py-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Globe className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  Enter your company URL
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We'll analyze your website and build your Business DNA automatically.
                </p>
              </div>

              <div className="rounded-2xl bg-muted/40 border border-border/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="h-6 w-6 text-primary/70" />
                  </div>
                  <div className="relative flex-1">
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
                      className="w-full h-12 text-base border-0 bg-transparent focus:outline-none text-foreground px-3"
                      autoFocus
                    />
                    {!urlInput && (
                      <div className="absolute inset-0 flex items-center pointer-events-none pl-3">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={placeholderIndex}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 0.4, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="text-base text-muted-foreground"
                          >
                            {URL_EXAMPLES[placeholderIndex]}
                          </motion.span>
                        </AnimatePresence>
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
                    className="h-12 px-6 rounded-xl bg-primary/80 hover:bg-primary text-primary-foreground font-medium text-base flex items-center gap-2 disabled:opacity-50 transition-all"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 ml-1">
                  <Sparkles className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground/60">
                    Paste your website or product page URL
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Steps 1-2: Analysis cards */}
          {step >= 1 && step < 3 && (
            <motion.div
              key="analyzing-container"
              className="flex flex-col md:flex-row gap-6 w-full items-stretch justify-center mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              {/* Left Card — Flipping Task Display */}
              <div className="bg-card rounded-3xl border border-border shadow-2xl shadow-primary/10 p-10 sm:p-14 flex flex-col items-center justify-center w-full md:w-1/2">
                <div className="w-28 h-28 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 relative">
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
                        <Telescope className="w-14 h-14 text-primary" />
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
                        <Dna className="w-14 h-14 text-primary" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="text-sm font-bold tracking-widest text-muted-foreground mb-4 uppercase">
                  STEP {step} OF 3
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-foreground text-center tracking-tight mb-3">
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
                  <div className="flex flex-col items-center justify-center w-full min-h-[60px] mt-2">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentTask}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.35 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        <span className="text-foreground font-medium">{currentTask}</span>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Right Card: Sources */}
              <div className="bg-card rounded-3xl border border-border shadow-2xl shadow-primary/10 p-8 sm:p-10 flex flex-col items-start justify-start w-full md:w-1/2">
                <div className="mb-6">
                  <Globe className="w-6 h-6 text-primary" />
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="text-sm font-bold tracking-widest text-foreground uppercase">
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

                <div className="flex flex-col gap-2 w-full min-h-[140px]">
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
                          className="flex items-center gap-2 text-sm"
                        >
                          {isLatest ? (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                              <motion.div
                                className="h-1.5 w-1.5 rounded-full bg-primary"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                            </div>
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <Check className="h-2.5 w-2.5 text-primary" />
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

                <div className="mt-auto pt-4 border-t border-border/50 w-full">
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
              className="w-full max-w-md mx-auto flex flex-col items-center"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
            >
              {/* Orb */}
              <div className="orb-stage mb-12 mt-4">
                <div className="orb-wrapper">
                  <div className="orb-glow-aura"></div>
                  <div className="orb-connectors">
                    <div className="silver-connector silver-connector-1"></div>
                    <div className="silver-connector silver-connector-2"></div>
                  </div>
                  <div className="orb-container"></div>
                </div>
              </div>

              {/* Agent Name Input */}
              <div className="w-full flex flex-col items-center min-h-[120px] justify-center">
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
                        className="flex items-center justify-center text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wide"
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
                        className="w-full px-5 py-4 text-center text-lg bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none text-foreground font-medium shadow-sm"
                        autoFocus
                      />
                      <AnimatePresence>
                        {agentName.trim().length > 0 && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-center text-xs text-muted-foreground mt-3"
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
                        onClick={() => onComplete(agentName.trim(), createdBrandId)}
                        className="w-full bg-card border border-border shadow-sm text-foreground hover:bg-muted px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        Take Me To {agentName.trim()}
                        <ArrowRight className="w-5 h-5 text-primary" />
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
