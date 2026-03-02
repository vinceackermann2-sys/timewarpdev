import { useState } from "react";
import { Package, Plus, Trash2, ChevronRight, Lock, Palette, Users, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_PRODUCT } from "@/components/database/ProductDetailView";
import { ProductDetailView } from "@/components/database/ProductDetailView";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessDNA, ProductEntry } from "@/components/database/BusinessDNAContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export function ProductListView({ activeBrandId }: { activeBrandId: string }) {
  const { userName, brands, products, setProducts, audiences, setAudiences } = useBusinessDNA();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [connectProductId, setConnectProductId] = useState<string | null>(null);
  // Filter products to only show those belonging to the active brand
  const brandProducts = products.filter(p => p.brandId === activeBrandId);
  const selectedProduct = brandProducts.find(p => p.id === selectedProductId);
  const connectProduct = products.find(p => p.id === connectProductId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newProduct: ProductEntry = {
      ...DEFAULT_PRODUCT,
      id: `product-${Date.now()}`,
      name: newName.trim(),
      lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      brandId: activeBrandId, // Auto-connect to active brand
    };
    setProducts(prev => [...prev, newProduct]);
    setNewName("");
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (selectedProductId === id) setSelectedProductId(null);
  };

  const handleSave = (updated: ProductEntry) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleSetBrand = (brandId: string) => {
    if (!connectProductId) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== connectProductId) return p;
      return { ...p, brandId: p.brandId === brandId ? undefined : brandId };
    }));
  };

  const toggleAudienceConnection = (audienceId: string) => {
    if (!connectProductId) return;
    setAudiences(prev => prev.map(a => {
      if (a.id !== audienceId) return a;
      const current = a.productIds || [];
      const has = current.includes(connectProductId);
      return { ...a, productIds: has ? current.filter(id => id !== connectProductId) : [...current, connectProductId] };
    }));
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
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? <span>Cancel</span> : <><Plus className="h-3.5 w-3.5" /> New Product</>}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Product Name</label>
              <div className="flex gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. AI Marketing Suite" className="h-9 text-sm flex-1" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
                <Button size="sm" className="h-9" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
              </div>
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
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
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
                          <span className="text-[10px] text-primary">{totalConnections} connection{totalConnections !== 1 ? "s" : ""}</span>
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
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Package className="h-6 w-6 text-primary" /></div>
          <p className="text-sm text-muted-foreground">No products yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first product to get started</p>
        </div>
      )}

      {/* Connection Dialog */}
      <Dialog open={!!connectProductId} onOpenChange={(open) => { if (!open) setConnectProductId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-primary" />
              Connect to {connectProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Brand */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="h-3 w-3" /> Brand
              </p>
              {brands.length > 0 ? (
                <div className="space-y-1.5">
                  {brands.map(b => {
                    const isConnected = connectProduct?.brandId === b.id;
                    return (
                      <button key={b.id} onClick={() => handleSetBrand(b.id)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors text-sm", isConnected ? "bg-primary/10 border-primary/30 text-foreground" : "bg-muted/20 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                        <Palette className={cn("h-4 w-4 shrink-0", isConnected ? "text-primary" : "")} />
                        <span className="flex-1 truncate">{b.name}</span>
                        {isConnected && <span className="text-primary text-xs font-medium">Connected</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 py-2">No brands created yet</p>
              )}
            </div>

            {/* Audiences */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Audiences
              </p>
              {audiences.length > 0 ? (
                <div className="space-y-1.5">
                  {audiences.map(a => {
                    const isConnected = connectProductId ? a.productIds?.includes(connectProductId) : false;
                    return (
                      <button key={a.id} onClick={() => toggleAudienceConnection(a.id)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors text-sm", isConnected ? "bg-primary/10 border-primary/30 text-foreground" : "bg-muted/20 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                        <Users className={cn("h-4 w-4 shrink-0", isConnected ? "text-primary" : "")} />
                        <span className="flex-1 truncate">{a.name}</span>
                        {isConnected && <span className="text-primary text-xs font-medium">Connected</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 py-2">No audiences created yet</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
