import { useState, useEffect } from "react";
import { useActionGate } from "@/hooks/useActionGate";
import { Globe, ArrowRight, Sparkles, Loader2, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { invokeEdgeFunction } from "@/lib/invokeWithTimeout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusinessDNA, BrandEntry, ProductEntry, AudienceEntry } from "./BusinessDNAContext";
import { DEFAULT_PRODUCT } from "./ProductDetailView";
import { DEFAULT_AUDIENCE } from "./AudienceDetailView";

const URL_EXAMPLES = [
  "tesla.com",
  "nike.com",
  "apple.com/iphone-16-pro",
  "dyson.com",
  "allbirds.com",
  "glossier.com/boy-brow",
  "notion.so",
  "figma.com",
];

interface AddProductURLViewProps {
  onBack: () => void;
  onComplete: (newBrandId?: string) => void;
  activeBrandId?: string | null;
}

export function AddProductURLView({ onBack, onComplete, activeBrandId }: AddProductURLViewProps) {
  const [url, setUrl] = useState(() => {
    const pending = sessionStorage.getItem('pendingProductUrl');
    if (pending) {
      sessionStorage.removeItem('pendingProductUrl');
      return pending;
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const { toast } = useToast();
  const { setBrands, setProducts, setAudiences } = useBusinessDNA();
  const { checkCanUseAction } = useActionGate();

  useEffect(() => {
    if (url || isLoading) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % URL_EXAMPLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [url, isLoading]);

  const handleContinue = async () => {
    if (!url.trim()) return;
    // Allow free users' first business without action check
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { count } = await supabase
        .from("user_business_data")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id);
      const isFirstBusiness = !count || count === 0;
      if (!isFirstBusiness && !checkCanUseAction()) return;
    }
    setIsLoading(true);
    setStatus("Scraping product page...");

    try {
      const { data, error } = await invokeEdgeFunction("scrape-product", { url: url.trim() });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to extract product data");

      setStatus("Creating entries...");

      const now = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const brandId = `brand-${Date.now()}`;

      const extracted = data.extracted;

      // Always create a brand entry
      const b = extracted.brand || {};
      const fallbackName = (() => {
        try {
          const u = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
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
      setBrands(prev => [...prev, newBrand]);

      // Build products array (handle both array and single format)
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
        brandId: activeBrandId || brandId,
      }));
      setProducts(prev => [...prev, ...newProducts]);

      const finalBrandId = activeBrandId || brandId;

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
      if (newAudiences.length > 0) {
        setAudiences(prev => [...prev, ...newAudiences]);
      }

      setIsDone(true);
      const productNames = newProducts.map(p => p.name).join(", ");
      setStatus(`Done! ${newProducts.length} product${newProducts.length > 1 ? 's' : ''} imported.`);
      toast({
        title: "Products imported",
        description: `${productNames} added to your Business DNA.`,
      });

      setTimeout(() => onComplete(finalBrandId || undefined), 1500);
    } catch (err: any) {
      console.error("Scrape error:", err);
      toast({
        title: "Import failed",
        description: err.message || "Could not scrape and extract product data.",
        variant: "destructive",
      });
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-6">
      {/* Back button — absolute so it doesn't affect centering */}
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isLoading}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl text-center space-y-8"
      >

        {/* Title — centered with more space */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="space-y-3 py-4"
        >
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Add a new product
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Paste your product page URL and we'll extract everything automatically.
          </p>
        </motion.div>

        {/* URL Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="rounded-2xl bg-muted/40 border border-border/40 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="h-6 w-6 text-primary/70" />
            </div>
            <div className="relative flex-1">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder=" "
                className="flex-1 h-12 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              />
              {/* Animated placeholder */}
              {!url && (
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
            <Button
              onClick={handleContinue}
              disabled={!url.trim() || isLoading}
              className="h-12 px-6 rounded-xl bg-primary/80 hover:bg-primary text-primary-foreground font-medium text-base gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isDone ? (
                <Check className="h-4 w-4" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-1.5 mt-2 ml-1">
            <Sparkles className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground/60">
              Link to a specific product for faster results
            </span>
          </div>
        </motion.div>

        {/* Status */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDone && <Check className="h-4 w-4 text-primary" />}
              {status}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
