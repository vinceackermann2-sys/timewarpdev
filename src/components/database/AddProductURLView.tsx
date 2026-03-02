import { useState } from "react";
import { Globe, ArrowRight, Sparkles, Loader2, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusinessDNA, BrandEntry, ProductEntry, AudienceEntry } from "./BusinessDNAContext";
import { DEFAULT_PRODUCT } from "./ProductDetailView";
import { DEFAULT_AUDIENCE } from "./AudienceDetailView";

interface AddProductURLViewProps {
  onBack: () => void;
  onComplete: (newBrandId?: string) => void;
  activeBrandId?: string | null;
}

export function AddProductURLView({ onBack, onComplete, activeBrandId }: AddProductURLViewProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isDone, setIsDone] = useState(false);
  const { toast } = useToast();
  const { setBrands, setProducts, setAudiences } = useBusinessDNA();

  const handleContinue = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setStatus("Scraping product page...");

    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { url: url.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to extract product data");

      setStatus("Creating entries...");

      const now = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const brandId = `brand-${Date.now()}`;
      const productId = `product-${Date.now()}`;
      const audienceId = `audience-${Date.now()}`;

      const extracted = data.extracted;

      // Create brand
      if (extracted.brand?.name) {
        const b = extracted.brand;
        const newBrand: BrandEntry = {
          id: brandId,
          name: b.name,
          category: b.category || "Brand",
          lastUpdated: now,
          colors: b.colors || undefined,
          typography: b.typography || undefined,
          logoUrls: Array.isArray(b.logoUrls) ? b.logoUrls : [],
          selectedLogo: 0,
          visualIdentity: b.visualIdentity || undefined,
        };
        setBrands(prev => [...prev, newBrand]);
      }

      // Create product
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
        brandId: activeBrandId || (extracted.brand?.name ? brandId : undefined),
      };
      setProducts(prev => [...prev, newProduct]);

      // If we created a new brand, use its id for the callback
      const finalBrandId = activeBrandId || (extracted.brand?.name ? brandId : undefined);

      // Create audience
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

      setIsDone(true);
      setStatus("Done! Product imported successfully.");
      toast({
        title: "Product imported",
        description: `${extracted.product?.name || "Product"} has been added to your Business DNA.`,
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
    <div className="flex flex-col items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl text-center space-y-6"
      >
        {/* Back button */}
        <div className="flex justify-start w-full">
          <Button variant="ghost" size="sm" onClick={onBack} disabled={isLoading}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Add a new product
          </h1>
          <p className="text-muted-foreground">
            Paste your product page URL above to find and research it.
          </p>
        </div>

        {/* URL Input Card */}
        <div className="rounded-2xl bg-muted/40 border border-border/40 p-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="h-6 w-6 text-primary/70" />
            </div>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourstore.com/blue-hoodie"
              className="flex-1 h-12 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
              disabled={isLoading}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            />
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
        </div>

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
