/**
 * Chat-driven onboarding flow.
 *
 * Replaces the standalone /onboarding wizard. Runs inside TimeWarpAIView
 * (the AI CEO chat surface) for first-time users. Asks the same questions
 * the visual wizard asks (URL → product picker → forging DNA → name) but
 * presents each step as a chat message with an inline interactive card.
 *
 * Reuses the same backend: scrape-product (discover + core), save-onboarding,
 * enrich-pillars (background). Mirrors the state machine in
 * src/components/database/BusinessDNAOnboarding.tsx (steps 0/1/2/4-5/6).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, ArrowRight, Sparkles, Check, AlertCircle, RotateCcw, Telescope,
  Loader2, CheckCircle2, WandSparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeWithTimeout";
import { invokeStreamingEdgeFunction } from "@/lib/invokeStreamingEdgeFunction";
import {
  useBusinessDNA,
  type BrandEntry,
  type ProductEntry,
  type AudienceEntry,
} from "@/components/database/BusinessDNAContext";
import { DEFAULT_PRODUCT } from "@/components/database/ProductDetailView";
import { DEFAULT_AUDIENCE } from "@/components/database/AudienceDetailView";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import BrandOrbLogo from "@/components/ui/brand-orb-logo";
import { cn } from "@/lib/utils";

// ─── Helpers (lifted from BusinessDNAOnboarding) ──────────────────────
const URL_EXAMPLES = [
  "tesla.com", "nike.com", "apple.com", "stripe.com",
  "notion.so", "mckinsey.com", "allbirds.com", "figma.com",
];

const THUMBNAIL_PATTERNS = /[_\-\/](thumb|thumbnail|small|tiny|icon|micro|avatar|placeholder|preview|badge)\b/i;
const DOWNSCALED_PARAMS = /[?&](w|width|h|height|size|resize|fit)=\d{1,3}(?:&|$)/i;
const LOW_RES_DIMENSION = /\/(\d{1,3})x(\d{1,3})\//;

function isLowQualityImage(url: string): boolean {
  if (THUMBNAIL_PATTERNS.test(url)) return true;
  if (DOWNSCALED_PARAMS.test(url)) return true;
  const dimMatch = url.match(LOW_RES_DIMENSION);
  if (dimMatch && Math.max(Number(dimMatch[1]), Number(dimMatch[2])) < 150) return true;
  if (/[_\-](\d{1,3})x(\d{0,3})?\./i.test(url)) {
    const m = url.match(/[_\-](\d{1,3})x(\d{0,3})?\./i);
    if (m && Number(m[1]) < 200) return true;
  }
  return false;
}

function deduplicateImages(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls.filter(url => {
    const base = url.split('?')[0].split('#')[0]
      .replace(/[_\-]\d{1,4}x\d{0,4}/g, '')
      .replace(/\/(large|medium|small|thumb|grande|compact|master)\//gi, '/');
    if (seen.has(base)) return false;
    seen.add(base);
    return true;
  });
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

interface DiscoveredProduct {
  url?: string;
  name?: string;
  description?: string;
  images: string[];
}

type Phase =
  | "url"          // waiting for URL
  | "analyzing"    // scrape-product discover running
  | "products"     // user picking products
  | "forging"      // scrape-product core + save-onboarding running
  | "naming"       // user choosing agent name
  | "supercharge"  // ask user whether to supercharge DNA with integrations/files
  | "done";        // navigating away

interface ChatOnboardingFlowProps {
  /** Optional URL to pre-fill (from landing-page funnel ?url= param). */
  initialUrl?: string | null;
  /**
   * Called once the user has named their agent and chosen whether to supercharge.
   * `transcript` is a flat list of chat-style messages summarising the onboarding
   * conversation so the host (AgentChatView) can persist it to the new business's
   * chat session.
   */
  onComplete: (
    agentName: string,
    brandId: string,
    supercharge: boolean,
    transcript: { role: "user" | "assistant"; content: string }[],
  ) => void;
}

export function ChatOnboardingFlow({ initialUrl, onComplete }: ChatOnboardingFlowProps) {
  // ── Phase state ──────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(initialUrl ? "analyzing" : "url");
  const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl || null);
  const [urlInput, setUrlInput] = useState("");

  // URL placeholder typewriter
  const [placeholderText, setPlaceholderText] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Discover (scrape) state
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("Initializing…");
  const progressTargetRef = useRef(0);
  const progressDisplayRef = useRef(0);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [discoveredProducts, setDiscoveredProducts] = useState<DiscoveredProduct[]>([]);
  const [businessTypeLabel, setBusinessTypeLabel] = useState("product");
  const [businessTypePlural, setBusinessTypePlural] = useState("products");
  const quickBrandRef = useRef<any>(null);

  // Product picking
  const [selectedProductIdx, setSelectedProductIdx] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Forging / persistence
  const [forgingTodos, setForgingTodos] = useState<{ label: string; done: boolean }[]>([
    { label: "Analyzing business", done: true },
    { label: "Confirming offerings", done: false },
    { label: "Forging DNA", done: false },
    { label: "Confirming data", done: false },
    { label: "Saving DNA", done: false },
  ]);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [createdBrandId, setCreatedBrandId] = useState<string | null>(null);
  const [createdBrandRowId, setCreatedBrandRowId] = useState<string | null>(null);
  const [createdBrandLogoUrl, setCreatedBrandLogoUrl] = useState<string | null>(null);
  const [createdBrandName, setCreatedBrandName] = useState<string | null>(null);

  // Naming
  const [agentName, setAgentName] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  // Context
  let contextAvailable = false;
  let reloadData: () => Promise<{ brands: BrandEntry[]; products: ProductEntry[]; audiences: AudienceEntry[] }> = async () => ({ brands: [], products: [], audiences: [] });
  let setBrands: React.Dispatch<React.SetStateAction<BrandEntry[]>> = () => {};
  try {
    const ctx = useBusinessDNA();
    reloadData = ctx.reloadData;
    setBrands = ctx.setBrands;
    contextAvailable = true;
  } catch { /* no provider */ }

  // ── Typewriter placeholder for URL phase ──
  useEffect(() => {
    if (phase !== "url") return;
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
        setExampleIndex(p => (p + 1) % URL_EXAMPLES.length);
      }
    } else if (charIndex < currentExample.length) {
      timeout = setTimeout(() => {
        setPlaceholderText(currentExample.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 80);
    } else {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    }
    return () => clearTimeout(timeout!);
  }, [charIndex, isDeleting, exampleIndex, phase]);

  // ── Smooth progress animation ──
  useEffect(() => {
    if (phase !== "analyzing") return;
    const startTime = Date.now();
    const FAST_PHASE_MS = 1400;
    const FAST_PHASE_TARGET = 80;

    const interval = setInterval(() => {
      const target = progressTargetRef.current;
      const current = progressDisplayRef.current;
      if (current >= 100) { clearInterval(interval); return; }

      let next: number;
      const elapsed = Date.now() - startTime;
      if (elapsed < FAST_PHASE_MS) {
        const t = Math.min(elapsed / FAST_PHASE_MS, 1);
        next = (1 - Math.pow(1 - t, 2.5)) * FAST_PHASE_TARGET;
      } else if (current < FAST_PHASE_TARGET) {
        next = current + Math.max(0.5, (FAST_PHASE_TARGET - current) * 0.2);
      } else if (current < target) {
        next = current + Math.max(0.2, (target - current) * 0.12);
      } else if (target >= 100) {
        next = current + Math.max(0.5, (100 - current) * 0.15);
      } else {
        next = Math.min(target + 2, current + 0.08);
      }
      progressDisplayRef.current = Math.min(100, next);
      setProgress(Math.round(next));
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Phase: analyzing — call scrape-product in DISCOVER mode ──
  useEffect(() => {
    if (phase !== "analyzing" || !activeUrl) return;
    let cancelled = false;
    setScrapeError(null);
    setProgress(0);
    progressDisplayRef.current = 0;
    progressTargetRef.current = 0;

    (async () => {
      try {
        const token = await waitForSession();
        if (!token) {
          if (!cancelled) setScrapeError("Authentication failed. Please refresh and try again.");
          return;
        }

        const { data, error } = await invokeStreamingEdgeFunction(
          "scrape-product",
          { url: activeUrl.trim(), mode: "discover" },
          (stage, percent) => {
            if (cancelled) return;
            const mapped = percent <= 5 ? 84
              : percent <= 15 ? 84
              : percent <= 45 ? 88
              : percent <= 50 ? 92
              : percent <= 70 ? 94
              : percent <= 85 ? 96 : 98;
            progressTargetRef.current = mapped;
            setProgressStage(stage);
          }
        );
        if (cancelled) return;
        if (error || !data?.success) {
          setScrapeError(data?.error || "Couldn't analyze that site. Try another URL.");
          return;
        }
        progressTargetRef.current = 100;
        setProgress(100);

        const products = Array.isArray(data.discoveredProducts) ? data.discoveredProducts : [];
        const normalized: DiscoveredProduct[] = products.map((p: any) => {
          const rawImages = Array.isArray(p.images) ? p.images : [p.image, p.images].flat();
          const images = rawImages
            .map((u: any) => {
              if (!u || typeof u !== "string") return null;
              const s = String(u).split(",")[0]?.trim().split(" ")[0];
              if (!s || s.startsWith("data:")) return null;
              try { return new URL(s.startsWith("//") ? `https:${s}` : s, p.url || activeUrl).toString(); }
              catch { return null; }
            })
            .filter((u: string | null): u is string => !!u && u.length > 10)
            .filter((u: string) => !isLowQualityImage(u));
          return { ...p, images: deduplicateImages(images) };
        });
        setDiscoveredProducts(normalized);
        if (data.quickBrand) quickBrandRef.current = data.quickBrand;

        const bt = (data.businessType || data.quickBrand?.businessType || "general") as string;
        const labelMap: Record<string, { label: string; plural: string }> = {
          ecommerce: { label: "product", plural: "products" },
          saas: { label: "plan", plural: "plans" },
          agency: { label: "service", plural: "services" },
          media: { label: "content", plural: "content" },
          marketplace: { label: "listing", plural: "listings" },
          consulting: { label: "service", plural: "services" },
          nonprofit: { label: "program", plural: "programs" },
          local: { label: "service", plural: "services" },
          enterprise_b2b: { label: "solution", plural: "solutions" },
          creator: { label: "offering", plural: "offerings" },
          general: { label: "product", plural: "products" },
        };
        const cfg = labelMap[bt] || labelMap.general;
        setBusinessTypeLabel(cfg.label);
        setBusinessTypePlural(cfg.plural);

        // Move to products phase
        setTimeout(() => {
          if (!cancelled) setPhase("products");
        }, 400);
      } catch (e: any) {
        if (!cancelled) setScrapeError(e?.message || "Something went wrong. Please try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [phase, activeUrl]);

  // ── Phase: forging — scrape-product CORE + save-onboarding ──
  useEffect(() => {
    if (phase !== "forging") return;
    let cancelled = false;
    setPersistenceError(null);

    const markTodo = (label: string) => {
      setForgingTodos(prev => prev.map(t => t.label === label ? { ...t, done: true } : t));
    };

    (async () => {
      // Phase 1: deep extraction
      markTodo("Confirming offerings");
      const selectedUrl = selectedProductIdx != null ? discoveredProducts[selectedProductIdx]?.url : undefined;

      const { data: extractData, error: extractError } = await invokeEdgeFunction("scrape-product", {
        url: activeUrl!.trim(),
        mode: "core",
        selectedProductUrls: selectedUrl ? [selectedUrl] : undefined,
      });
      if (cancelled) return;

      if (extractError || !extractData?.success) {
        setPersistenceError(extractData?.error || "Failed to analyze business. Please try again.");
        return;
      }

      markTodo("Forging DNA");
      const extracted = extractData.extracted || {};
      const redditUsed = extractData.redditEnriched && Array.isArray(extractData.redditUrls) && extractData.redditUrls.length > 0;
      if (redditUsed) markTodo("Confirming data"); else markTodo("Confirming data");

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
        businessType: b.businessType || undefined,
      } as BrandEntry;

      const productsRaw = extracted.products || (extracted.product ? [extracted.product] : []);
      const filteredProducts = productsRaw.slice(0, 1);
      const newProducts: ProductEntry[] = filteredProducts.map((p: any, i: number) => {
        const images = p.images?.length
          ? p.images.map((imgUrl: string, j: number) => ({
              id: `img-${j + 1}`, url: imgUrl, label: `Product Image ${j + 1}`,
            }))
          : DEFAULT_PRODUCT.images;
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
          brandId,
        } as ProductEntry;
      });

      const audiencesRaw = extracted.audiences || (extracted.audience ? [extracted.audience] : []);
      const parsedAudiences: AudienceEntry[] = audiencesRaw
        .filter((a: any) => a?.name)
        .slice(0, 1)
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
          brandId,
        } as AudienceEntry));

      const coveredProductIds = new Set(parsedAudiences.flatMap(a => a.productIds || []));
      const missingProducts = newProducts.filter(p => !coveredProductIds.has(p.id));
      const fallbackAudiences: AudienceEntry[] = missingProducts.map((p, i) => ({
        ...DEFAULT_AUDIENCE,
        id: `audience-${Date.now()}-fill-${i}`,
        name: `${p.name} Audience`,
        description: `Target audience for ${p.name}`,
        lastUpdated: now,
        productIds: [p.id],
        brandId,
      } as AudienceEntry));
      const newAudiences = [...parsedAudiences, ...fallbackAudiences];

      if (cancelled) return;
      const { data: saveData, error: saveError } = await supabase.functions.invoke("save-onboarding", {
        body: {
          brandData: newBrand,
          productsData: newProducts,
          audiencesData: newAudiences,
          brandName,
        },
      });
      if (cancelled) return;
      if (saveError || !saveData?.success) {
        setPersistenceError(saveData?.error || "Failed to save brand. Please try again.");
        return;
      }
      markTodo("Saving DNA");

      if (saveData.workspaceId) {
        localStorage.setItem("preferred_workspace_id", saveData.workspaceId);
      }

      const savedBrandRowId = typeof saveData.brandRowId === "string" ? saveData.brandRowId : null;
      let reloadedBrands: any[] = [];
      if (contextAvailable) {
        const result = await reloadData();
        reloadedBrands = result.brands;
      }

      setCreatedBrandId(brandId);
      setCreatedBrandRowId(savedBrandRowId || reloadedBrands.find((br: any) => br.id === brandId)?._rowId || null);
      const firstLogo = Array.isArray(newBrand.logoUrls) && newBrand.logoUrls.length > 0
        ? newBrand.logoUrls[0]
        : null;
      setCreatedBrandLogoUrl(firstLogo);
      setCreatedBrandName(newBrand.name);

      // Background pillar enrichment
      if (contextAvailable) {
        let rowId: string | undefined = savedBrandRowId || undefined;
        if (!rowId) {
          for (let attempt = 0; attempt < 3; attempt++) {
            const brandRow = reloadedBrands.find((bb: any) => bb.id === brandId);
            rowId = (brandRow as any)?._rowId;
            if (rowId) break;
            await new Promise(r => setTimeout(r, 1500));
            const retryResult = await reloadData();
            reloadedBrands = retryResult.brands;
          }
        }
        if (rowId) {
          invokeEdgeFunction("enrich-pillars", {
            brandId,
            brandRowId: rowId,
            workspaceId: saveData.workspaceId || null,
          }).catch((e) => console.warn("Pillar enrichment failed (non-blocking):", e));
        }
      }

      setTimeout(() => {
        if (!cancelled) setPhase("naming");
      }, 600);
    })();

    return () => { cancelled = true; };
  }, [phase]);

  // ── Handlers ──
  const handleSubmitUrl = useCallback(() => {
    const next = urlInput.trim();
    if (!next) return;
    setActiveUrl(next);
    setPhase("analyzing");
  }, [urlInput]);

  const handleRetryAnalyze = useCallback(() => {
    setScrapeError(null);
    setProgress(0);
    progressDisplayRef.current = 0;
    progressTargetRef.current = 0;
    setDiscoveredProducts([]);
    setPhase("analyzing");
  }, []);

  const handleSubmitProducts = useCallback(() => {
    if (selectedProductIdx == null && discoveredProducts.length > 0) {
      setSelectedProductIdx(0);
    }
    setForgingTodos([
      { label: "Analyzing business", done: true },
      { label: "Confirming offerings", done: false },
      { label: "Forging DNA", done: false },
      { label: "Confirming data", done: false },
      { label: "Saving DNA", done: false },
    ]);
    setPhase("forging");
  }, [selectedProductIdx, discoveredProducts.length]);

  const handleFinishNaming = useCallback(async () => {
    const trimmed = agentName.trim();
    if (!trimmed || !createdBrandId) return;
    setIsCompleting(true);
    try {
      const targetRowId = createdBrandRowId || createdBrandId;
      const { data: existing } = await supabase
        .from("user_business_data")
        .select("content")
        .eq("id", targetRowId)
        .maybeSingle();
      const brandData = JSON.parse((existing as any)?.content || "{}");
      brandData.agentName = trimmed;
      await supabase
        .from("user_business_data")
        .update({ content: JSON.stringify(brandData) })
        .eq("id", targetRowId);
      setBrands(prev =>
        prev.map(b =>
          (b as any)._rowId === targetRowId || b.id === brandData.id || b.id === createdBrandId
            ? { ...b, agentName: trimmed }
            : b
        )
      );
    } catch { /* best effort */ }
    setIsCompleting(false);
    setPhase("supercharge");
  }, [agentName, createdBrandId, createdBrandRowId, setBrands]);

  const handleSuperchargeChoice = useCallback((wantsSupercharge: boolean) => {
    if (!createdBrandId) return;
    setPhase("done");
    const trimmedAgent = agentName.trim();
    const selectedProductName =
      selectedProductIdx != null ? discoveredProducts[selectedProductIdx]?.name : undefined;
    const transcript: { role: "user" | "assistant"; content: string }[] = [
      {
        role: "assistant",
        content:
          "Welcome 👋 Let's set up your business so I can act as your CEO.\n\nWhat's your company website?",
      },
      ...(activeUrl ? [{ role: "user" as const, content: activeUrl }] : []),
      {
        role: "assistant",
        content: activeUrl
          ? `Analyzed **${activeUrl}** and discovered ${discoveredProducts.length} ${businessTypePlural}.`
          : "Analyzed your business.",
      },
      ...(selectedProductName
        ? [{ role: "user" as const, content: selectedProductName }]
        : []),
      {
        role: "assistant",
        content:
          "Forging your Business DNA — confirming offerings, forging DNA, confirming data, saving.",
      },
      {
        role: "assistant",
        content: "Your DNA is forged. What should I call your AI agent?",
      },
      ...(trimmedAgent ? [{ role: "user" as const, content: trimmedAgent }] : []),
      {
        role: "assistant",
        content:
          "Want to supercharge your DNA by connecting your tools or uploading files? You can also do this later from Business DNA.",
      },
      {
        role: "user",
        content: wantsSupercharge ? "Yes, supercharge" : "Skip for now",
      },
      {
        role: "assistant",
        content: wantsSupercharge
          ? `Great — let's supercharge ${trimmedAgent || "your agent"}. Taking you to the supercharge flow.`
          : `All set. ${trimmedAgent || "Your agent"} is ready to help. What do you want to work on first?`,
      },
    ];
    onComplete(trimmedAgent, createdBrandId, wantsSupercharge, transcript);
  }, [agentName, createdBrandId, onComplete, activeUrl, discoveredProducts, businessTypePlural, selectedProductIdx]);

  // ─────────── RENDER ───────────

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Greeting bubble */}
        <AssistantBubble>
          <div className="flex items-center gap-3 mb-2">
            <BusinessBrainOrb size={32} />
            <div>
              <p className="text-[15px] font-semibold text-foreground">Welcome 👋</p>
              <p className="text-[13px] text-muted-foreground">
                Let's set up your business so I can act as your CEO.
              </p>
            </div>
          </div>
          <p className="text-[14px] text-foreground">
            What's your company website? Paste any URL and I'll do the research for you.
          </p>
        </AssistantBubble>

        {/* URL input card */}
        {phase === "url" && (
          <UserActionCard>
            <div className="border-[1.5px] border-primary rounded-2xl p-2 shadow-sm bg-background">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0 px-1">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-primary" strokeWidth={2} />
                  </div>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmitUrl(); }}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground text-[16px] sm:text-[15px]"
                    placeholder={`e.g. ${placeholderText}|`}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSubmitUrl}
                  disabled={!urlInput.trim()}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-[15px] shrink-0"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 mt-3 mb-2">
                <WandSparkles className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                <span className="text-[13px] text-muted-foreground">Company URL works best.</span>
              </div>
            </div>
          </UserActionCard>
        )}

        {/* User echoed URL */}
        {phase !== "url" && activeUrl && (
          <UserBubble>
            <span className="font-medium">{activeUrl}</span>
          </UserBubble>
        )}

        {/* Analyzing */}
        {phase === "analyzing" && (
          <AssistantBubble>
            <div className="rounded-xl border border-black/5 bg-background p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <Telescope className="w-5 h-5 text-primary" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-foreground truncate">
                    Analyzing {activeUrl}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate">{progressStage}</p>
                </div>
              </div>
              {scrapeError ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{scrapeError}</span>
                  </div>
                  <button
                    onClick={handleRetryAnalyze}
                    className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Try again
                  </button>
                </div>
              ) : (
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(3, progress)}%` }}
                  />
                </div>
              )}
            </div>
          </AssistantBubble>
        )}

        {/* Product picker */}
        {phase === "products" && (
          <>
            <AssistantBubble>
              <p className="text-[14px] text-foreground mb-1">
                I found {discoveredProducts.length} {businessTypePlural}. Pick the one you sell —
                I'll build your DNA around it.
              </p>
            </AssistantBubble>
            <UserActionCard wide>
              {discoveredProducts.length === 0 ? (
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <p className="text-muted-foreground text-sm mb-3">
                    No {businessTypePlural} detected. I'll build DNA from your brand data.
                  </p>
                  <button
                    onClick={handleSubmitProducts}
                    className="bg-primary hover:bg-primary/90 transition-colors text-white px-5 py-2 rounded-xl font-medium text-sm"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {discoveredProducts.slice(0, 8).map((p, i) => {
                      const isSelected = selectedProductIdx === i;
                      const imgUrl = p.images?.[0];
                      const showImg = imgUrl && !failedImages.has(imgUrl);
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedProductIdx(isSelected ? null : i)}
                          className={cn(
                            "text-left rounded-2xl overflow-hidden border-2 transition-all",
                            isSelected
                              ? "border-primary ring-4 ring-[#4a86ff]/20"
                              : "border-transparent bg-muted hover:border-border"
                          )}
                        >
                          <div className="relative h-28 bg-card flex items-center justify-center">
                            {showImg ? (
                              <img
                                src={imgUrl}
                                alt={p.name || ""}
                                className="w-full h-full object-cover"
                                onError={() => setFailedImages(prev => new Set(prev).add(imgUrl!))}
                              />
                            ) : (
                              <Globe className="w-7 h-7 text-muted-foreground/40" />
                            )}
                            <div
                              className={cn(
                                "absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                isSelected ? "bg-primary border-primary" : "bg-black/40 border-white/60"
                              )}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </div>
                          </div>
                          <div className="p-3 bg-background">
                            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-0.5 uppercase">
                              {businessTypeLabel}
                            </p>
                            <p className="text-[13px] font-bold text-foreground leading-tight line-clamp-2">
                              {p.name || `${businessTypeLabel} ${i + 1}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSubmitProducts}
                      disabled={selectedProductIdx == null}
                      className="bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[14px]"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </UserActionCard>
          </>
        )}

        {/* Echo selected product */}
        {(phase === "forging" || phase === "naming" || phase === "done") &&
          selectedProductIdx != null && discoveredProducts[selectedProductIdx] && (
            <UserBubble>
              <span className="font-medium">
                {discoveredProducts[selectedProductIdx].name || "Selected"}
              </span>
            </UserBubble>
        )}

        {/* Forging timeline */}
        {phase === "forging" && (
          <AssistantBubble>
            <div className="rounded-xl border border-black/5 bg-background p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-[14px] font-semibold text-foreground">Forging your Business DNA</p>
              </div>
              {persistenceError ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{persistenceError}</span>
                  </div>
                  <button
                    onClick={() => { setPersistenceError(null); setPhase("forging"); }}
                    className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Retry
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {forgingTodos.map((t, idx) => {
                    const previousDone = idx === 0 || forgingTodos[idx - 1].done;
                    const isActive = !t.done && previousDone;
                    return (
                      <li key={t.label} className="flex items-center gap-2 text-[13.5px]">
                        {t.done ? (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                        )}
                        <span className={cn(t.done ? "text-foreground" : "text-muted-foreground")}>
                          {t.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </AssistantBubble>
        )}

        {/* Naming */}
        {phase === "naming" && (
          <>
            <AssistantBubble>
              <div className="flex items-center gap-3 mb-2">
                <BrandOrbLogo logoUrl={createdBrandLogoUrl} brandName={createdBrandName} size={36} />
                <p className="text-[14px] text-foreground">
                  Your DNA is forged. What should I call your AI agent?
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
                    className="bg-muted border-[1.5px] border-primary rounded-2xl p-2 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-1">
                        <WandSparkles className="w-5 h-5 text-primary" strokeWidth={2} />
                      </div>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && agentName.trim()) handleFinishNaming();
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-foreground text-[16px] sm:text-[15px]"
                        placeholder="e.g. Nova, Atlas, Sage…"
                        autoFocus
                      />
                      <button
                        onClick={handleFinishNaming}
                        disabled={!agentName.trim()}
                        className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="going"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-primary text-sm py-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving {agentName.trim()}…
                  </motion.div>
                )}
              </AnimatePresence>
            </UserActionCard>
          </>
        )}

        {/* Echo agent name once supercharge prompt is up */}
        {phase === "supercharge" && agentName.trim() && (
          <UserBubble>
            <span className="font-medium">{agentName.trim()}</span>
          </UserBubble>
        )}

        {/* Supercharge prompt */}
        {phase === "supercharge" && (
          <>
            <AssistantBubble>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <p className="text-[15px] font-semibold text-foreground">
                  Want to supercharge your DNA?
                </p>
              </div>
              <p className="text-[14px] text-foreground leading-relaxed">
                Connect your tools (Gmail, Drive, HubSpot, Slack…) or upload files and URLs so I can fill in the gaps with verified, real evidence — no made-up data. You can also do this later from Business DNA.
              </p>
            </AssistantBubble>
            <UserActionCard>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSuperchargeChoice(true)}
                  className="bg-primary hover:bg-primary/90 transition-colors text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]"
                >
                  <Sparkles className="w-4 h-4" /> Yes, supercharge
                </button>
                <button
                  onClick={() => handleSuperchargeChoice(false)}
                  className="bg-card border border-border hover:bg-muted transition-colors text-foreground px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 text-[15px]"
                >
                  Skip for now <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </UserActionCard>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Local presentational helpers ─────────────────────────────────────

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
        <img src="/favicon.png" alt="AI CEO" className="w-5 h-5 rounded-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 bg-card border border-border rounded-2xl rounded-tl-md p-4 shadow-sm">
        {children}
      </div>
    </motion.div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] bg-primary text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-[14px] shadow-sm">
        {children}
      </div>
    </motion.div>
  );
}

function UserActionCard({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className={cn("ml-11", wide ? "" : "")}
    >
      {children}
    </motion.div>
  );
}
