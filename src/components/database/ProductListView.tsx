import { useState } from "react";
import { Package, Plus, Trash2, ChevronRight, Lock, Palette, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_PRODUCT } from "@/components/database/ProductDetailView";
import { ProductDetailView } from "@/components/database/ProductDetailView";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessDNA, ProductEntry } from "@/components/database/BusinessDNAContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProductListView() {
  const { userName, brands, products, setProducts } = useBusinessDNA();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBrandId, setNewBrandId] = useState<string>("");

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newProduct: ProductEntry = {
      ...DEFAULT_PRODUCT,
      id: `product-${Date.now()}`,
      name: newName.trim(),
      lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      brandId: newBrandId || undefined,
    };
    setProducts(prev => [...prev, newProduct]);
    setNewName("");
    setNewBrandId("");
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (selectedProductId === id) setSelectedProductId(null);
  };

  const handleSave = (updated: ProductEntry) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleChangeBrand = (productId: string, brandId: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, brandId: brandId || undefined } : p));
  };

  if (selectedProduct) {
    const connectedBrand = brands.find(b => b.id === selectedProduct.brandId);
    return (
      <div>
        {/* Brand connection bar */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">Brand:</span>
          <Select value={selectedProduct.brandId || ""} onValueChange={(v) => handleChangeBrand(selectedProduct.id, v)}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="No brand linked" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(b => (
                <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {connectedBrand && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">
              <Palette className="h-2.5 w-2.5" /> {connectedBrand.name}
            </span>
          )}
        </div>
        <ProductDetailView
          product={selectedProduct}
          onBack={() => setSelectedProductId(null)}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">My Products</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? <span>Cancel</span> : <><Plus className="h-3.5 w-3.5" /> New Product</>}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Product Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. AI Marketing Suite" className="h-9 text-sm" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Connect to Brand</label>
                <Select value={newBrandId} onValueChange={setNewBrandId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select a brand (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-sm">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button size="sm" className="h-9" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {products.length > 0 ? (
        <div className="space-y-2">
          {products.map((product) => {
            const connectedBrand = brands.find(b => b.id === product.brandId);
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
                    </div>
                    {connectedBrand && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          <Palette className="h-2.5 w-2.5" /> {connectedBrand.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
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
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No products yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first product to get started</p>
        </div>
      )}
    </div>
  );
}
