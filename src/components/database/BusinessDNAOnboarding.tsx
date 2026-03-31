import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, ArrowRight, Sparkles, Check, AlertCircle, RotateCcw, Rocket,
  FolderOpenDot, Lock, Telescope, Loader2, CheckCircle2, ChevronUp,
  Maximize2, UploadCloud, Lightbulb, WandSparkles,
} from "lucide-react";
import startBusinessBg from "@/assets/start-business-bg.webp";
import addBusinessBg from "@/assets/add-business-bg.webp";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeWithTimeout";
import { useBusinessDNA, BrandEntry, ProductEntry, AudienceEntry } from "./BusinessDNAContext";
import { DEFAULT_PRODUCT } from "./ProductDetailView";
import { DEFAULT_AUDIENCE } from "./AudienceDetailView";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";

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

function getInitialSource(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function urlToDisplaySource(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/+$/, "");
    return path ? `${host}${path}` : host;
  } catch {
    return url;
  }
}

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
  isAddBusiness?: boolean;
  activeBrandId?: string | null;
  onBack?: () => void;
}

// ─── Step mapping ──────────────────────────────────────────────
// 0  URL input
// 1  Analyzing (scrape running)
// 2  Product selection cards
// 3  Image picker per product
// 4  Forging DNA – "Data Found" tab  (persistence + enrichment)
// 5  Forging DNA – "Confirmed Data" tab
// 6  Agent naming

export function BusinessDNAOnboarding({
  productUrl: initialUrl,
  onComplete,
  isAddBusiness,
  activeBrandId,
  onBack,
}: BusinessDNAOnboardingProps) {
  // ── shared state ───────────────────────────────────────────
  const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl || null);
  const [urlInput, setUrlInput] = useState("");
  const [step, setStep] = useState(initialUrl ? 1 : 0);
  const [showMethodPicker, setShowMethodPicker] = useState(isAddBusiness && !initialUrl);
  const [agentName, setAgentName] = useState("");
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [progress, setProgress] = useState(0);

  // URL placeholder typewriter
  const [placeholderText, setPlaceholderText] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUrlFocused, setIsUrlFocused] = useState(false);

  // Product selection (step 2)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  // Image picker (step 3)
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState<Record<number, number>>({});
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Forging DNA tabs (step 4-5)
  const [forgingTab, setForgingTab] = useState<"found" | "confirmed">("found");

  // Scrape / persistence
  const scrapeResult = useRef<any>(null);
  const [scrapeComplete, setScrapeComplete] = useState(false);
  const [scrapeError, setScrapeError] = useState(false);
  const [createdBrandId, setCreatedBrandId] = useState<string | undefined>();
  const [persistenceComplete, setPersistenceComplete] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const workspaceIdRef = useRef<string | null>(null);

  const scrapeCompleteRef = useRef(false);
  const persistenceCompleteRef = useRef(false);
  const progressRef = useRef(0);
  useEffect(() => { scrapeCompleteRef.current = scrapeComplete; }, [scrapeComplete]);
  useEffect(() => { persistenceCompleteRef.current = persistenceComplete; }, [persistenceComplete]);

  // Context
  let contextAvailable = false;
  let reloadData: () => Promise<{ brands: BrandEntry[]; products: ProductEntry[]; audiences: AudienceEntry[] }> = async () => ({ brands: [], products: [], audiences: [] });
  let brands: BrandEntry[] = [];
  let refreshBrand: ((brandId: string) => Promise<void>) | null = null;
  let setBrands: React.Dispatch<React.SetStateAction<BrandEntry[]>> = () => {};
  try {
    const ctx = useBusinessDNA();
    reloadData = ctx.reloadData;
    brands = ctx.brands;
    refreshBrand = ctx.refreshBrand;
    setBrands = ctx.setBrands;
    contextAvailable = true;
  } catch { /* No provider */ }

  const initialSource = activeUrl ? getInitialSource(activeUrl) : null;

  // ── Typewriter effect for URL placeholder ────────────────
  useEffect(() => {
    if (step !== 0 || showMethodPicker) return;
    const currentExample = URL_EXAMPLES[exampleIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (isDeleting) {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setPlaceholderText(currentExample.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 40);
      } else {
        setIsDeleting(false);
        setExampleIndex(prev => (prev + 1) % URL_EXAMPLES.length);
      }
    } else {
      if (charIndex < currentExample.length) {
        timeout = setTimeout(() => {
          setPlaceholderText(currentExample.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 80);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2000);
      }
    }
    return () => clearTimeout(timeout!);
  }, [charIndex, isDeleting, exampleIndex, step, showMethodPicker]);

  // ── Step 1: Fire scrape-product ──────────────────────────
  useEffect(() => {
    if (step < 1 || !activeUrl) return;
    if (scrapeComplete || scrapeResult.current) return; // already ran
    let cancelled = false;
    (async () => {
      try {
        const token = await waitForSession();
        if (!token) {
          if (!cancelled) {
            setScrapeError(true);
            setScrapeComplete(true);
            setPersistenceError("Authentication failed. Please refresh and try again.");
          }
          return;
        }
        workspaceIdRef.current = null;
        const { data, error } = await invokeEdgeFunction("scrape-product", { url: activeUrl.trim(), mode: "core" });
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

  // Progress animation for step 1
  useEffect(() => {
    if (step !== 1) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // climb to 80 normally, then slow
        if (scrapeCompleteRef.current) {
          return Math.min(100, prev + 8);
        }
        if (prev < 80) return prev + 2;
        return prev + 0.3;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [step]);

  // Transition step 1 → 2 once scrape completes
  useEffect(() => {
    if (step === 1 && scrapeComplete && !scrapeError) {
      setProgress(100);
      const timeout = setTimeout(() => setStep(2), 600);
      return () => clearTimeout(timeout);
    }
  }, [step, scrapeComplete, scrapeError]);

  // ── Step 4: persist via edge function ────────────────────
  useEffect(() => {
    if (step !== 4) return;
    if (persistenceComplete || persistenceCompleteRef.current) return;
    let cancelled = false;

    (async () => {
      const extracted = scrapeResult.current || {};
      const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const brandId = `brand-${Date.now()}`;

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

      // Filter products by user selection
      const productsRaw = extracted.products || (extracted.product ? [extracted.product] : []);
      const filteredProducts = selectedProducts.length > 0
        ? selectedProducts.map(i => productsRaw[i]).filter(Boolean)
        : productsRaw.slice(0, 3);

      const newProducts: ProductEntry[] = filteredProducts.slice(0, 5).map((p: any, i: number) => {
        // Apply selected image if available
        const selectedImgIdx = selectedImages[i];
        const images = p.images?.length
          ? p.images.map((imgUrl: string, j: number) => ({
              id: `img-${j + 1}`,
              url: imgUrl,
              label: `Product Image ${j + 1}`,
            }))
          : DEFAULT_PRODUCT.images;
        // Move selected image to front if specified
        if (selectedImgIdx !== undefined && selectedImgIdx > 0 && images.length > selectedImgIdx) {
          const [picked] = images.splice(selectedImgIdx, 1);
          images.unshift(picked);
        }

        return {
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
          dosAndDonts: { dos: p.dosAndDonts?.dos || [], donts: p.dosAndDonts?.donts || [] },
          powerPhrases: p.powerPhrases || [],
          powerWords: p.powerWords || [],
          technicalLevel: p.technicalLevel || "",
          refinementChecklist: p.refinementChecklist || [],
          images,
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
        };
      });

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
          dosAndDonts: { dos: a.dosAndDonts?.dos || [], donts: a.dosAndDonts?.donts || [] },
          powerPhrases: a.powerPhrases || [],
          powerWords: a.powerWords || [],
          technicalLevel: a.technicalLevel || "",
          refinementChecklist: a.refinementChecklist || [],
          lastUpdated: now,
          productIds: newProducts[i] ? [newProducts[i].id] : [],
          brandId: isAddBusiness && activeBrandId ? activeBrandId : brandId,
        }));

      if (cancelled) return;

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

      if (data.workspaceId) {
        localStorage.setItem("preferred_workspace_id", data.workspaceId);
      }

      const savedBrandRowId = typeof data.brandRowId === "string" ? data.brandRowId : undefined;

      let reloadedBrands: any[] = [];
      if (contextAvailable) {
        const result = await reloadData();
        reloadedBrands = result.brands;
      }

      const finalBrandId = isAddBusiness && activeBrandId ? activeBrandId : brandId;
      setCreatedBrandId(finalBrandId);
      setPersistenceComplete(true);
      setForgingTab("confirmed");

      // Enrichment
      if (contextAvailable) {
        let rowId: string | undefined = savedBrandRowId;
        if (!rowId) {
          for (let attempt = 0; attempt < 3; attempt++) {
            const brandRow = reloadedBrands.find((bb: any) => bb.id === finalBrandId);
            rowId = (brandRow as any)?._rowId;
            if (rowId) break;
            await new Promise(r => setTimeout(r, 1500));
            const retryResult = await reloadData();
            reloadedBrands = retryResult.brands;
          }
        }
        if (rowId) {
          const firstProduct = filteredProducts[0] || {};
          const firstAudience = audiencesRaw[0] || {};
          try {
            const res = await invokeEdgeFunction("enrich-brand", {
              brandRowId: rowId,
              brandName,
              brandCategory: b.category || "lifestyle",
              brandColors: b.colors || {},
              audienceDesc: firstAudience.description || "",
              audiencePowerWords: (firstAudience.powerWords || []).slice(0, 5).join(", "),
              productBenefits: (firstProduct.benefits || []).slice(0, 6).join("; "),
              buyingTriggers: (firstAudience.buyingTriggers || []).slice(0, 4).join("; "),
              websiteUrl: activeUrl || "",
            });
            if (res.data?.success && refreshBrand) {
              await refreshBrand(finalBrandId);
            }
          } catch (e) {
            console.warn("Brand enrichment failed (non-blocking):", e);
          }
        }
      }

      if (!cancelled) {
        setTimeout(() => setStep(6), 800);
      }
    })();

    return () => { cancelled = true; };
  }, [step]);

  const handleRetry = useCallback(() => {
    setPersistenceError(null);
    setScrapeComplete(false);
    setScrapeError(false);
    setProgress(0);
    progressRef.current = 0;
    setStep(1);
  }, []);

  // ── Helpers ──────────────────────────────────────────────
  const extractedProducts = scrapeResult.current?.products || (scrapeResult.current?.product ? [scrapeResult.current.product] : []);

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center py-12 font-sans">
      <AnimatePresence mode="wait">
        {/* ─── METHOD PICKER (add-business only) ─── */}
        {showMethodPicker && step === 0 && (
          <motion.div
            key="method-picker"
            className="w-full max-w-4xl mx-auto text-center space-y-6 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            {isAddBusiness && onBack && (
              <div className="w-full text-left mb-2">
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 text-sm text-[#697386] hover:text-[#1a1f36] transition-colors"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Back
                </button>
              </div>
            )}
            <div className="space-y-2 py-4">
              <h1 className="text-[32px] font-bold text-[#1a1f36] tracking-tight">
                How would you like to get started?
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* From Scratch — Coming Soon */}
              <div className="relative rounded-2xl border border-black/5 bg-[#f4f3ee] overflow-hidden opacity-75 cursor-not-allowed">
                <div className="absolute top-3 right-3 z-10">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-[#697386] border border-black/5">
                    <Lock className="h-2.5 w-2.5" /> Coming Soon
                  </span>
                </div>
                <div className="relative">
                  <img src={addBusinessBg} alt="" className="w-full h-80 object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Rocket className="h-16 w-16 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-5 text-left">
                  <h3 className="text-base font-semibold text-[#1a1f36]">From Scratch</h3>
                  <p className="text-sm text-[#697386] mt-1">Create from scratch with AI</p>
                </div>
              </div>
              {/* From Existing */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowMethodPicker(false)}
                className="rounded-2xl border border-black/5 hover:border-[#3399ff]/40 bg-[#f4f3ee] overflow-hidden transition-colors text-left cursor-pointer"
              >
                <div className="relative">
                  <img src={startBusinessBg} alt="" className="w-full h-80 object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FolderOpenDot className="h-16 w-16 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold text-[#1a1f36]">From Existing</h3>
                  <p className="text-sm text-[#697386] mt-1">Create from existing business</p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 0: URL INPUT ─── */}
        {step === 0 && !showMethodPicker && (
          <motion.div
            key="url-input"
            className="w-full max-w-3xl px-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            {isAddBusiness && (
              <div className="w-full text-left mb-4">
                <button
                  onClick={() => setShowMethodPicker(true)}
                  className="flex items-center gap-1.5 text-sm text-[#697386] hover:text-[#1a1f36] transition-colors"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Back
                </button>
              </div>
            )}

            <h1 className="text-[32px] font-bold text-[#1a1f36] mb-3">Add a business</h1>
            <p className="text-[#697386] text-[15px] mb-8 text-center">
              Paste your company URL. We only access public data.
            </p>

            <div className="w-full max-w-[720px]">
              <div className="bg-[#f4f3ee] border-[1.5px] border-[#3399ff] rounded-2xl p-2 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-1">
                    <Globe className="w-5 h-5 text-[#3399ff]" strokeWidth={2} />
                  </div>
                  <input
                    type="text"
                    value={urlInput}
                    onFocus={() => setIsUrlFocused(true)}
                    onBlur={() => setIsUrlFocused(false)}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && urlInput.trim()) {
                        setActiveUrl(urlInput.trim());
                        setStep(1);
                      }
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-[#1a1f36] text-[15px]"
                    placeholder={`e.g. ${placeholderText}|`}
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (urlInput.trim()) {
                        setActiveUrl(urlInput.trim());
                        setStep(1);
                      }
                    }}
                    disabled={!urlInput.trim()}
                    className="bg-[#3399ff] hover:bg-[#287acc] disabled:opacity-50 transition-colors text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className={`transition-all duration-300 overflow-hidden ${isUrlFocused ? "max-h-0 opacity-0" : "max-h-20 opacity-100"}`}>
                  <div className="flex items-center gap-2 px-3 mt-3 mb-2">
                    <WandSparkles className="w-4 h-4 text-[#697386]" strokeWidth={2} />
                    <span className="text-[13px] text-[#697386]">Company URL works best.</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 1: ANALYZING ─── */}
        {step === 1 && (
          <motion.div
            key="analyzing"
            className="w-full max-w-3xl px-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-[32px] font-bold text-[#1a1f36] mb-8">Finding your business</h1>

            <div className="w-full max-w-[720px] bg-[#f4f3ee] rounded-2xl p-6 shadow-sm border border-black/5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-xl bg-[#e6f2ff] flex items-center justify-center shrink-0">
                  <Telescope className="w-5 h-5 text-[#3399ff]" strokeWidth={2} />
                </div>
                <span className="text-[17px] text-[#1a1f36] truncate">{activeUrl}</span>
              </div>

              {scrapeError ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{persistenceError || "Failed to analyze. Please try again."}</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3399ff]/10 hover:bg-[#3399ff]/20 text-[#3399ff] text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 px-1">
                    <Loader2 className="w-4 h-4 text-[#3399ff] animate-spin" strokeWidth={2.5} />
                    <span className="text-[14px] text-[#697386]">Analyzing business...</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#e5e4df] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3399ff] rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(15, progress)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── STEP 2: PRODUCT SELECTION ─── */}
        {step === 2 && (
          <motion.div
            key="product-select"
            className="w-full max-w-5xl px-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-[32px] font-bold text-[#1a1f36] mb-8">Add products to business DNA</h1>

            {/* URL bar with continue */}
            <div className="w-full max-w-[900px] bg-[#f4f3ee] border-[1.5px] border-[#3399ff] rounded-2xl p-2 shadow-sm mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3 px-2">
                <Globe className="w-5 h-5 text-[#3399ff]" strokeWidth={2} />
                <span className="text-[#1a1f36] font-medium text-[15px]">{activeUrl}</span>
              </div>
              <button
                onClick={() => {
                  // If no products selected, select all (up to 3)
                  if (selectedProducts.length === 0) {
                    const allIdx = extractedProducts.slice(0, 3).map((_: any, i: number) => i);
                    setSelectedProducts(allIdx);
                  }
                  if (extractedProducts.some((p: any) => p.images?.length > 0)) {
                    setCurrentProductIndex(0);
                    setStep(3);
                  } else {
                    setStep(4); // skip image picker if no images
                  }
                }}
                disabled={selectedProducts.length === 0 && extractedProducts.length === 0}
                className="bg-[#3399ff] disabled:opacity-50 hover:bg-[#287acc] transition-colors text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Product Cards Grid */}
            {extractedProducts.length > 0 ? (
              <div className="w-full max-w-[900px] grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {extractedProducts.slice(0, 10).map((p: any, i: number) => {
                  const isSelected = selectedProducts.includes(i);
                  const imgUrl = p.images?.[0] || null;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedProducts(selectedProducts.filter(id => id !== i));
                        } else if (selectedProducts.length < 3) {
                          setSelectedProducts([...selectedProducts, i]);
                        }
                      }}
                      className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${
                        isSelected
                          ? "border-[#3399ff] ring-4 ring-[#3399ff]/20"
                          : "border-transparent bg-[#f4f3ee] hover:border-[#e5e4df]"
                      }`}
                    >
                      <div className="relative h-48 bg-white flex items-center justify-center">
                        {imgUrl ? (
                          <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#e5e4df] flex items-center justify-center">
                            <Globe className="w-8 h-8 text-[#697386]/40" />
                          </div>
                        )}
                        <div
                          className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#3399ff] border-[#3399ff]" : "bg-black/40 border-white/60"
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <div className="p-5 bg-[#f4f3ee]">
                        <p className="text-[12px] font-semibold text-[#697386] tracking-wider mb-1">PRODUCT</p>
                        <h3 className="text-[16px] font-bold text-[#1a1f36] mb-2 leading-tight">{p.name || `Product ${i + 1}`}</h3>
                        {p.description && (
                          <p className="text-[13px] text-[#697386] line-clamp-2">{p.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full max-w-[900px] bg-[#f4f3ee] rounded-2xl p-8 text-center">
                <p className="text-[#697386] text-[15px]">No products found. We'll create your business DNA from brand data.</p>
                <button
                  onClick={() => setStep(4)}
                  className="mt-4 bg-[#3399ff] hover:bg-[#287acc] transition-colors text-white px-6 py-2.5 rounded-xl font-medium text-[15px]"
                >
                  Continue
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── STEP 3: IMAGE PICKER ─── */}
        {step === 3 && (
          <motion.div
            key="image-picker"
            className="w-full max-w-4xl px-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            {(() => {
              const productIdx = selectedProducts[currentProductIndex] ?? 0;
              const product = extractedProducts[productIdx];
              const productImages: string[] = product?.images || [];
              const selectedImg = selectedImages[currentProductIndex] ?? 0;

              return (
                <>
                  {/* Top bar */}
                  <div className="w-full bg-[#f4f3ee] rounded-2xl p-4 flex items-center justify-between shadow-sm mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        {productImages[0] ? (
                          <img src={productImages[0]} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <Globe className="w-5 h-5 text-[#697386]" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-[17px] font-semibold text-[#1a1f36]">
                          {product?.name || "Product"}
                        </h3>
                        <p className="text-[14px] text-[#697386]">
                          Product {currentProductIndex + 1} of {selectedProducts.length} – Select best image
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (currentProductIndex < selectedProducts.length - 1) {
                          setCurrentProductIndex(prev => prev + 1);
                        } else {
                          setStep(4);
                        }
                      }}
                      className="bg-[#3399ff] hover:bg-[#287acc] transition-colors text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]"
                    >
                      {currentProductIndex < selectedProducts.length - 1 ? "Next product" : "Use this image"}{" "}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-full flex flex-col items-start mb-4">
                    <h2 className="text-[20px] font-semibold text-[#1a1f36] mb-1">Pick the strongest product shot</h2>
                  </div>

                  {/* Image Grid */}
                  {productImages.length > 0 ? (
                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                      {productImages.slice(0, 6).map((imgSrc: string, idx: number) => (
                        <div
                          key={idx}
                          onClick={() =>
                            setSelectedImages(prev => ({ ...prev, [currentProductIndex]: idx }))
                          }
                          className={`relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                            selectedImg === idx ? "border-[#3399ff]" : "border-transparent"
                          }`}
                        >
                          <img src={imgSrc} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-3 right-3">
                            {selectedImg === idx ? (
                              <div className="w-6 h-6 rounded-full bg-[#3399ff] flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white/50" />
                            )}
                          </div>
                          <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full bg-[#f4f3ee] rounded-2xl p-8 text-center mb-8">
                      <p className="text-[#697386]">No images found for this product.</p>
                    </div>
                  )}

                  {/* Upload Card */}
                  <div className="w-full bg-[#f4f3ee] rounded-2xl p-5 flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-[16px] font-semibold text-[#1a1f36] mb-1">Upload your own photo</h3>
                      <p className="text-[14px] text-[#697386]">Uploading will set the image as the new main photo.</p>
                    </div>
                    <button className="bg-white border border-[#e5e4df] hover:bg-gray-50 transition-colors text-[#1a1f36] px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-[14px]">
                      <UploadCloud className="w-4 h-4" /> Upload image
                    </button>
                  </div>

                  {/* Info Accordion */}
                  <div className="w-full mb-4">
                    <div
                      className="flex items-center justify-between cursor-pointer py-2"
                      onClick={() => setIsInfoOpen(!isInfoOpen)}
                    >
                      <div className="flex items-center gap-2 text-[#3399ff] text-[14px] font-medium">
                        <Lightbulb className="w-4 h-4" />
                        <span>What makes a great product image?</span>
                      </div>
                      <ChevronUp className={`w-4 h-4 text-[#3399ff] transition-transform ${isInfoOpen ? "" : "rotate-180"}`} />
                    </div>
                    {isInfoOpen && (
                      <div className="pt-1 pb-2">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                          {["Clean background", "Only your product", "Bright and clear", "High quality"].map((text, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                              <span className="text-[#1a1f36] text-[13px]">{text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* ─── STEPS 4-5: FORGING DNA ─── */}
        {(step === 4 || step === 5) && (
          <motion.div
            key="forging"
            className="w-full max-w-3xl px-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-[32px] font-bold text-[#1a1f36] mb-8">Forging your business DNA</h1>

            {/* Top Card */}
            <div className="w-full bg-[#f4f3ee] rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    <Sparkles className="w-5 h-5 text-[#3399ff]" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#1a1f36]">{activeUrl}</h3>
                    <p className="text-[14px] text-[#697386]">Step 2 of 3 – Forging your business DNA</p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(6)}
                  disabled={!persistenceComplete}
                  className={`${
                    !persistenceComplete ? "bg-[#3399ff]/50 cursor-not-allowed" : "bg-[#3399ff] hover:bg-[#287acc]"
                  } text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px] transition-colors`}
                >
                  Finalize Agent <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {persistenceError ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{persistenceError}</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3399ff]/10 hover:bg-[#3399ff]/20 text-[#3399ff] text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Try Again
                  </button>
                </div>
              ) : !persistenceComplete ? (
                <div className="flex flex-col">
                  <p className="text-[16px] font-medium text-[#697386] mb-4">Building your unfair advantage</p>
                  <ul className="flex flex-col gap-2">
                    {["Analyze your business", "Find what makes it great", "Find data to back it", "Construct DNA"].map((todo, i) => (
                      <li key={i} className="flex items-center gap-2 text-[15px] text-[#697386]">
                        <Loader2 className="w-3.5 h-3.5 text-[#3399ff] animate-spin" />
                        {todo}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col">
                  <p className="text-[16px] font-medium text-[#22c55e] mb-4">✓ Business DNA forged successfully</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="w-full flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setForgingTab("found")}
                  className={`px-4 py-1.5 rounded-full text-[14px] font-medium flex items-center gap-2 transition-colors ${
                    forgingTab === "found"
                      ? "bg-white border border-[#e5e4df] text-[#1a1f36] shadow-sm"
                      : "bg-[#f4f3ee] text-[#697386] hover:bg-[#e5e4df]"
                  }`}
                >
                  Data Found
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                    forgingTab === "found" ? "bg-[#1a1f36] text-white" : "bg-[#d1d0cb] text-white"
                  }`}>
                    3
                  </span>
                </button>
                <button
                  onClick={() => setForgingTab("confirmed")}
                  className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors ${
                    forgingTab === "confirmed"
                      ? "bg-white border border-[#e5e4df] text-[#1a1f36] shadow-sm"
                      : "bg-[#f4f3ee] text-[#697386] hover:bg-[#e5e4df]"
                  }`}
                >
                  Confirmed Data
                </button>
              </div>

              {forgingTab === "found" ? (
                <div className="w-full flex flex-col gap-3">
                  {["Brand identity", "Target audience", "Value proposition"].map((title, i) => (
                    <div key={i} className="w-full bg-[#f4f3ee] rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {!persistenceComplete ? (
                          <Loader2 className="w-4 h-4 text-[#3399ff] animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
                        )}
                        <span className="text-[15px] font-medium text-[#1a1f36]">{title}</span>
                      </div>
                      {!persistenceComplete && (
                        <div className="w-12 h-6 bg-[#e5e4df] rounded-md animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full flex flex-col gap-3">
                  {["Brand identity", "Target audience", "Value proposition"].map((title, i) => (
                    <div key={i} className="w-full bg-[#f9f9f8] border border-[#e5e4df] rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
                      <span className="text-[15px] font-medium text-[#1a1f36]">{title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── STEP 6: AGENT NAME ─── */}
        {step === 6 && (
          <motion.div
            key="agent-name"
            className="w-full max-w-3xl px-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
          >
            {/* Orb */}
            <div className="mb-8 mt-2">
              <BusinessBrainOrb size={120} className="sm:hidden" />
              <BusinessBrainOrb size={160} className="hidden sm:flex" />
            </div>

            <h1 className="text-[32px] font-bold text-[#1a1f36] mb-8">Choose agent name</h1>

            <div className="w-full max-w-md">
              <AnimatePresence mode="wait">
                {!isNameSubmitted ? (
                  <motion.div
                    key="name-input"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="bg-[#f4f3ee] border-[1.5px] border-[#3399ff] rounded-2xl p-2 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-1">
                          <WandSparkles className="w-5 h-5 text-[#3399ff]" strokeWidth={2} />
                        </div>
                        <input
                          type="text"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && agentName.trim().length > 0) {
                              setIsNameSubmitted(true);
                            }
                          }}
                          className="flex-1 bg-transparent border-none outline-none text-[#1a1f36] text-[15px]"
                          placeholder="e.g. My Agent..."
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (agentName.trim()) setIsNameSubmitted(true);
                          }}
                          disabled={!agentName.trim()}
                          className="bg-[#3399ff] hover:bg-[#287acc] disabled:bg-[#3399ff]/50 disabled:cursor-not-allowed transition-colors text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]"
                        >
                          Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="take-me"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full flex flex-col items-center"
                  >
                    <button
                      onClick={async () => {
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
                            setBrands(prev =>
                              prev.map(b =>
                                (b as any)._rowId === createdBrandId || b.id === brandData.id
                                  ? { ...b, agentName: agentName.trim() }
                                  : b
                              )
                            );
                          } catch { /* best effort */ }
                        }
                        onComplete(agentName.trim(), createdBrandId);
                      }}
                      className="w-full bg-[#f4f3ee] border border-[#e5e4df] shadow-sm text-[#1a1f36] hover:bg-[#e5e4df] px-6 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      Take Me To {agentName.trim()}
                      <ArrowRight className="w-5 h-5 text-[#3399ff]" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
