import { useState } from "react";
import { useActionGate } from "@/hooks/useActionGate";
import { Package, Plus, Trash2, ChevronRight, Lock, Palette, Users, Link2, Globe, ArrowRight, Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_PRODUCT } from "@/components/database/ProductDetailView";
import { ProductDetailView } from "@/components/database/ProductDetailView";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessDNA, ProductEntry } from "@/components/database/BusinessDNAContext";
import { ConnectionDialog } from "@/components/database/ConnectionDialog";
import { invokeEdgeFunction } from "@/lib/invokeWithTimeout";
import { useToast } from "@/hooks/use-toast";

export function ProductListView({ activeBrandId }: { activeBrandId: string }) {
  const { userName, brands, products, setProducts, audiences, deleteProduct } = useBusinessDNA();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [connectProductId, setConnectProductId] = useState<string | null>(null);
  const { toast } = useToast();
  const { checkCanUseAction } = useActionGate();
  // Filter products to only show ones belonging to this brand
  const brandProducts = products.filter(p => p.brandId === activeBrandId);
  const selectedProduct = brandProducts.find(p => p.id === selectedProductId);
  

  const handleExtract = async () => {
    if (!url.trim()) return;
    if (!checkCanUseAction()) return;
    setIsLoading(true);
    setStatus("Scraping product page...");

    try {
      const { data, error } = await invokeEdgeFunction("scrape-product", { url: url.trim(), mode: "core" });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to extract product data");

      setStatus("Creating product...");

      const now = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const productId = `product-${Date.now()}`;
      const p = data.extracted?.product || {};

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
        brandId: activeBrandId,
      };
      setProducts(prev => [...prev, newProduct]);

      setIsDone(true);
      setStatus("Product imported!");
      toast({
        title: "Product imported",
        description: `${p.name || "Product"} has been added.`,
      });

      setTimeout(() => {
        setIsCreating(false);
        setUrl("");
        setStatus("");
        setIsDone(false);
      }, 1500);
    } catch (err: any) {
      console.error("Scrape error:", err);
      toast({
        title: "Import failed",
        description: err.message || "Could not extract product data.",
        variant: "destructive",
      });
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    if (selectedProductId === id) setSelectedProductId(null);
  };

  const handleSave = (updated: ProductEntry) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };




  if (selectedProduct) {
    return (
      <ProductDetailView
        product={selectedProduct}
        onBack={() => setSelectedProductId(null)}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
         <h3 className="text-base font-semibold text-foreground">Products</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{brandProducts.length} product{brandProducts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isCreating && (
            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => {
              const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
              const newProduct: ProductEntry = {
                ...DEFAULT_PRODUCT,
                id: `product-${Date.now()}`,
                name: "New Product",
                lastUpdated: now,
                brandId: activeBrandId,
              };
              setProducts(prev => [...prev, newProduct]);
              setSelectedProductId(newProduct.id);
            }}>
              <Plus className="h-3.5 w-3.5" /> Blank Product
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setIsCreating(!isCreating)}>
            {isCreating ? <span>Cancel</span> : <><Sparkles className="h-3.5 w-3.5" /> From URL</>}
        </Button>
        </div>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Product URL</label>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-primary/70" />
                </div>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourstore.com/product-page" className="h-9 text-sm flex-1" disabled={isLoading} onKeyDown={(e) => e.key === "Enter" && handleExtract()} />
                <Button size="sm" className="h-9 gap-1.5" onClick={handleExtract} disabled={!url.trim() || isLoading}>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isDone ? <Check className="h-3.5 w-3.5" /> : <><Sparkles className="h-3.5 w-3.5" /> Extract</>}
                </Button>
              </div>
              {status && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isDone && <Check className="h-3 w-3 text-primary" />}
                  {status}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {brandProducts.length > 0 ? (
        <div className="space-y-2">
          {brandProducts.map((product) => {
            const connectedBrand = brands.find(b => b.id === product.brandId);
            const connectedAudiences = audiences.filter(a => a.productIds?.includes(product.id));
            const totalConnections = (connectedBrand ? 1 : 0) + connectedAudiences.length;
            return (
              <div key={product.id} className="group rounded-xl border border-border/40 bg-card/50 hover:bg-card transition-colors cursor-pointer">
                <div className="flex items-center gap-3 px-4 py-3.5" onClick={() => setSelectedProductId(product.id)}>
                  <div className="h-10 w-10 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category} · Updated {product.lastUpdated}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70"><Lock className="h-2.5 w-2.5" />Private</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/70">Last updated: {product.lastUpdated}</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/70">Added by: {userName}</span>
                      {totalConnections > 0 && (
                        <>
                          <span className="text-[10px] text-muted-foreground/40">·</span>
                          <span className="text-[10px] text-primary">Connected</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); setConnectProductId(product.id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all" title="Manage connections">
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3"><Package className="h-6 w-6 text-foreground" /></div>
          <p className="text-sm text-muted-foreground">No products yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first product to get started</p>
        </div>
      )}

      {/* Connection Dialog */}
      <ConnectionDialog
        open={!!connectProductId}
        onOpenChange={(open) => { if (!open) setConnectProductId(null); }}
        focusEntityId={connectProductId}
        activeBrandId={activeBrandId}
      />
    </div>
  );
}
