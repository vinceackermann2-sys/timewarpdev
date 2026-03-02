import { useState } from "react";
import { Palette, Plus, Trash2, ChevronRight, Lock, Package, Users, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandingEditor } from "@/components/database/BrandingEditor";
import { BrandExtendedSections } from "@/components/database/BrandExtendedSections";
import { BrandPageSidebar } from "@/components/database/BrandPageSidebar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useBusinessDNA, BrandEntry } from "@/components/database/BusinessDNAContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export function BrandListView() {
  const { userName, brands, setBrands, products, setProducts, audiences, setAudiences } = useBusinessDNA();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [connectBrandId, setConnectBrandId] = useState<string | null>(null);

  const [isBrandingEditing, setIsBrandingEditing] = useState(false);
  const [isVisualIdentityEditing, setIsVisualIdentityEditing] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState<string>("branding");
  const { toast } = useToast();

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const connectBrand = brands.find(b => b.id === connectBrandId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newBrand: BrandEntry = {
      id: `brand-${Date.now()}`,
      name: newName.trim(),
      category: "Brand",
      lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    };
    setBrands(prev => [...prev, newBrand]);
    setNewName("");
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    setBrands(prev => prev.filter(b => b.id !== id));
    if (selectedBrandId === id) setSelectedBrandId(null);
  };

  const toggleProductConnection = (productId: string) => {
    if (!connectBrandId) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      return { ...p, brandId: p.brandId === connectBrandId ? undefined : connectBrandId };
    }));
  };

  const toggleAudienceConnection = (audienceId: string) => {
    if (!connectBrandId) return;
    const brandProductIds = products.filter(p => p.brandId === connectBrandId).map(p => p.id);
    // For audiences, we toggle all brand's products
    setAudiences(prev => prev.map(a => {
      if (a.id !== audienceId) return a;
      const current = a.productIds || [];
      const hasAny = brandProductIds.some(pid => current.includes(pid));
      if (hasAny) {
        return { ...a, productIds: current.filter(pid => !brandProductIds.includes(pid)) };
      } else {
        return { ...a, productIds: [...current, ...brandProductIds] };
      }
    }));
  };

  const getConnectedProducts = (brandId: string) => products.filter(p => p.brandId === brandId);
  const getConnectedAudiences = (brandId: string) => {
    const productIds = getConnectedProducts(brandId).map(p => p.id);
    return audiences.filter(a => a.productIds?.some(pid => productIds.includes(pid)));
  };

  if (selectedBrand) {
    return (
      <div className="space-y-0">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => setSelectedBrandId(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <h3 className="text-base font-semibold text-foreground">{selectedBrand.name}</h3>
        </div>
        <div className="flex gap-8">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <BrandingEditor isEditing={isBrandingEditing} onEditToggle={() => setIsBrandingEditing(!isBrandingEditing)} onCancel={() => setIsBrandingEditing(false)} onSave={() => { toast({ title: "Branding saved" }); }} />
            </div>
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden" id="extended-brand">
              <BrandExtendedSections isEditing={isVisualIdentityEditing} onEditToggle={() => setIsVisualIdentityEditing(!isVisualIdentityEditing)} />
            </div>
          </div>
          <div className="hidden lg:block w-52 shrink-0 self-start">
            <BrandPageSidebar activeSection={activeSidebarSection} onSectionClick={(id) => { setActiveSidebarSection(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">My Brands</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{brands.length} brand{brands.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? <span>Cancel</span> : <><Plus className="h-3.5 w-3.5" /> New Brand</>}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Brand Name</label>
              <div className="flex gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. My Skincare Brand" className="h-9 text-sm flex-1" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
                <Button size="sm" className="h-9" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {brands.length > 0 ? (
        <div className="space-y-2">
          {brands.map((brand) => {
            const connProducts = getConnectedProducts(brand.id);
            const connAudiences = getConnectedAudiences(brand.id);
            const totalConnections = connProducts.length + connAudiences.length;
            return (
              <div key={brand.id} className="group rounded-xl border border-border/40 bg-card/50 hover:bg-card transition-colors cursor-pointer">
                <div className="flex items-center gap-3 px-4 py-3.5" onClick={() => setSelectedBrandId(brand.id)}>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Palette className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{brand.name}</p>
                    <p className="text-xs text-muted-foreground">{brand.category} · Updated {brand.lastUpdated}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70"><Lock className="h-2.5 w-2.5" />Private</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/70">Last updated: {brand.lastUpdated}</span>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); setConnectBrandId(brand.id); }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                      title="Manage connections"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(brand.id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
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
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Palette className="h-6 w-6 text-primary" /></div>
          <p className="text-sm text-muted-foreground">No brands yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first brand to get started</p>
        </div>
      )}

      {/* Connection Dialog */}
      <Dialog open={!!connectBrandId} onOpenChange={(open) => { if (!open) setConnectBrandId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-primary" />
              Connect to {connectBrand?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Products */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3 w-3" /> Products
              </p>
              {products.length > 0 ? (
                <div className="space-y-1.5">
                  {products.map(p => {
                    const isConnected = p.brandId === connectBrandId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProductConnection(p.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors text-sm",
                          isConnected ? "bg-primary/10 border-primary/30 text-foreground" : "bg-muted/20 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
                        <Package className={cn("h-4 w-4 shrink-0", isConnected ? "text-primary" : "")} />
                        <span className="flex-1 truncate">{p.name}</span>
                        {isConnected && <span className="text-primary text-xs font-medium">Connected</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 py-2">No products created yet</p>
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
                    const brandProductIds = products.filter(p => p.brandId === connectBrandId).map(p => p.id);
                    const isConnected = brandProductIds.some(pid => a.productIds?.includes(pid));
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAudienceConnection(a.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors text-sm",
                          isConnected ? "bg-primary/10 border-primary/30 text-foreground" : "bg-muted/20 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
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
