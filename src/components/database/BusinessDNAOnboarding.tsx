import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Telescope, Dna, ArrowRight, Globe, Sparkles, Check } from "lucide-react";
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

const STEP_1_TEXTS = [
  "Scanning website architecture...",
  "Extracting core value propositions...",
  "Identifying market opportunities...",
  "Analyzing competitor landscape...",
  "Mapping target audience...",
];

const STEP_2_TEXTS = [
  "Synthesizing brand voice...",
  "Structuring core offerings...",
  "Defining unique selling points...",
  "Generating positioning strategy...",
  "Finalizing business profile...",
];

const STEP_1_EXAMPLES = [
  "Extracting product features & pricing",
  "Identified 3 competitor brands",
  "Mapping brand color palette",
  "Found 8 unique selling points",
  "Analyzing customer review sentiment",
  "Extracting social proof & testimonials",
  "Scanning meta tags & SEO structure",
  "Detected target demographic signals",
];

const STEP_2_EXAMPLES = [
  "Creating brand identity profile",
  "Mapping 5 audience segments",
  "Generating positioning strategy",
  "Building competitive advantage matrix",
  "Synthesizing brand voice guidelines",
  "Structuring product catalog data",
  "Defining ideal customer persona",
  "Compiling market opportunity brief",
];

function getDomainSources(url: string): string[] {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname;
    const pages = [
      path || "/",
      "/about",
      "/products",
      "/pricing",
      "/blog",
      "/contact",
      "/features",
    ];
    const domainSources = pages.map((p) => `${host}${p}`);
    const thirdParty = [
      `google.com/search?q=${host}`,
      `linkedin.com/company/${host.split(".")[0]}`,
      `crunchbase.com/organization/${host.split(".")[0]}`,
      `reddit.com/search?q=${host.split(".")[0]}`,
      `twitter.com/search?q=${host.split(".")[0]}`,
    ];
    return [...domainSources, ...thirdParty];
  } catch {
    return [url, "google.com/search", "linkedin.com/company", "crunchbase.com"];
  }
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
  const [textIndex, setTextIndex] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);

  // Scanned sources tracking
  const [scannedSources, setScannedSources] = useState<string[]>([]);
  const [currentSourceIdx, setCurrentSourceIdx] = useState(0);

  // Scrape state
  const scrapeResult = useRef<any>(null);
  const [scrapeComplete, setScrapeComplete] = useState(false);
  const [scrapeError, setScrapeError] = useState(false);
  const [step1AnimDone, setStep1AnimDone] = useState(false);
  const [createdBrandId, setCreatedBrandId] = useState<string | undefined>();

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

  const allSources = activeUrl ? getDomainSources(activeUrl) : [];

  // URL placeholder rotation for step 0
  useEffect(() => {
    if (step !== 0 || urlInput) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % URL_EXAMPLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [step, urlInput]);

  // Step 1: Fire scrape-product
  useEffect(() => {
    if (step < 1 || !activeUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("scrape-product", {
          body: { url: activeUrl.trim() },
        });
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

  // Source accumulation — add a new source every 1.2s
  useEffect(() => {
    if ((step !== 1 && step !== 2) || allSources.length === 0) return;
    setScannedSources([]);
    setCurrentSourceIdx(0);
    const interval = setInterval(() => {
      setCurrentSourceIdx((prev) => {
        const next = prev + 1;
        if (next >= allSources.length) {
          clearInterval(interval);
          return prev;
        }
        setScannedSources((s) => [...s, allSources[next]]);
        return next;
      });
    }, 1200);
    // Add first source immediately
    setScannedSources([allSources[0]]);
    return () => clearInterval(interval);
  }, [step >= 1 && step < 3 ? 1 : 0, allSources.length]);

  // Two-phase progress bar
  useEffect(() => {
    if (step < 1 || step > 2) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress((prev) => {
        if (prev < 80) {
          // Phase 1: rush to 80% in ~3s with ease-out
          const t = Math.min(elapsed / 3000, 1);
          const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
          return Math.min(80, Math.round(eased * 80));
        }
        // Phase 2: slow crawl until scrape completes
        if (scrapeComplete && step1AnimDone) return 100;
        if (step === 2) return Math.min(99, prev + 0.15);
        return Math.min(99, prev + 0.05);
      });
    }, 80);
    return () => clearInterval(timer);
  }, [step, scrapeComplete, step1AnimDone]);

  // Example snippets rotation
  useEffect(() => {
    if (step < 1 || step > 2) return;
    const examples = step === 1 ? STEP_1_EXAMPLES : STEP_2_EXAMPLES;
    setExampleIndex(0);
    const interval = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % examples.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [step]);

  // Step 1 text animation
  useEffect(() => {
    if (step !== 1) return;
    const interval = setInterval(() => {
      setTextIndex((prev) => {
        if (prev >= STEP_1_TEXTS.length - 1) {
          clearInterval(interval);
          setStep1AnimDone(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [step]);

  // Transition from step 1 → 2
  useEffect(() => {
    if (step === 1 && step1AnimDone && scrapeComplete) {
      const timeout = setTimeout(() => {
        setStep(2);
        setTextIndex(0);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [step, step1AnimDone, scrapeComplete]);

  // Step 2: create entries + text animation
  useEffect(() => {
    if (step !== 2) return;

    if (contextAvailable && scrapeResult.current && !scrapeError) {
      const extracted = scrapeResult.current;
      const now = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const brandId = `brand-${Date.now()}`;
      const productId = `product-${Date.now()}`;
      const audienceId = `audience-${Date.now()}`;

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
      setBrands(prev => [...prev, newBrand]);
      setCreatedBrandId(brandId);

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
      setProducts(prev => [...prev, newProduct]);

      if (extracted.audience?.name) {
        const a = extracted.audience;
        const newAudience: AudienceEntry = {
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
        setAudiences(prev => [...prev, newAudience]);
      }
    }

    const interval = setInterval(() => {
      setTextIndex((prev) => {
        if (prev >= STEP_2_TEXTS.length - 1) {
          clearInterval(interval);
          setTimeout(() => setStep(3), 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [step]);

  const currentExamples = step === 1 ? STEP_1_EXAMPLES : STEP_2_EXAMPLES;
  const visibleSources = scannedSources.slice(-5);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-sans overflow-hidden relative">
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top 3-bump progress bar — only show during steps 1-3 */}
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
            <div className="flex justify-center w-full mb-3 px-1">
              <p className="text-sm font-medium text-muted-foreground">
                {step === 1 ? "Deep business research in progress..." : "Building your business profile..."}
              </p>
            </div>
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
              {/* Left Card */}
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

                <div className="h-6 flex items-center justify-center overflow-hidden w-full">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${step}-${textIndex}`}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-medium text-muted-foreground text-center"
                    >
                      {step === 1 ? STEP_1_TEXTS[textIndex] : STEP_2_TEXTS[textIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Example snippets */}
                <div className="mt-5 h-7 flex items-center justify-center overflow-hidden w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`example-${step}-${exampleIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-2"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground/70 font-medium">
                        {currentExamples[exampleIndex % currentExamples.length]}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
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
                  <div className="flex gap-1">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} />
                  </div>
                </div>

                {/* Stacking scanned sources list */}
                <div className="flex flex-col gap-2 w-full min-h-[140px]">
                  <AnimatePresence>
                    {visibleSources.map((source, i) => {
                      const isLatest = i === visibleSources.length - 1;
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
