import { useState } from "react";
import { Users, Plus, Trash2, ChevronRight, Lock, Package, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_AUDIENCE } from "@/components/database/AudienceDetailView";
import { AudienceDetailView } from "@/components/database/AudienceDetailView";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessDNA, AudienceEntry } from "@/components/database/BusinessDNAContext";

export function AudienceListView() {
  const { userName, products, audiences, setAudiences } = useBusinessDNA();
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProductIds, setNewProductIds] = useState<string[]>([]);

  const selectedAudience = audiences.find(a => a.id === selectedAudienceId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newAudience: AudienceEntry = {
      ...DEFAULT_AUDIENCE,
      id: `audience-${Date.now()}`,
      name: newName.trim(),
      lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      productIds: newProductIds.length > 0 ? newProductIds : undefined,
    };
    setAudiences(prev => [...prev, newAudience]);
    setNewName("");
    setNewProductIds([]);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    setAudiences(prev => prev.filter(a => a.id !== id));
    if (selectedAudienceId === id) setSelectedAudienceId(null);
  };

  const handleSave = (updated: AudienceEntry) => {
    setAudiences(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const toggleProductConnection = (audienceId: string, productId: string) => {
    setAudiences(prev => prev.map(a => {
      if (a.id !== audienceId) return a;
      const current = a.productIds || [];
      const next = current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId];
      return { ...a, productIds: next.length > 0 ? next : undefined };
    }));
  };

  const toggleNewProductId = (productId: string) => {
    setNewProductIds(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };

  if (selectedAudience) {
    const connectedProducts = products.filter(p => selectedAudience.productIds?.includes(p.id));
    return (
      <div className="-mx-6 pt-0">
        {/* Product connection bar */}
        <div className="mx-6 mb-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Connected Products:</span>
            {connectedProducts.length === 0 && <span className="text-xs text-muted-foreground/50">None</span>}
            {connectedProducts.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                <Package className="h-2.5 w-2.5" /> {p.name}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {products.map(p => {
              const isConnected = selectedAudience.productIds?.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProductConnection(selectedAudience.id, p.id)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-lg border transition-colors",
                    isConnected
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary"
                  )}
                >
                  <Package className="h-2.5 w-2.5 inline mr-1" />
                  {p.name}
                  {isConnected && <span className="ml-1">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
        <AudienceDetailView
          audience={selectedAudience}
          onBack={() => setSelectedAudienceId(null)}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">My Audiences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {audiences.length} audience{audiences.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? <span>Cancel</span> : <><Plus className="h-3.5 w-3.5" /> New Audience</>}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Audience Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Young Professionals 25-35" className="h-9 text-sm" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
              </div>
              {products.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Connect to Products</label>
                  <div className="flex flex-wrap gap-1.5">
                    {products.map(p => {
                      const isSelected = newProductIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleNewProductId(p.id)}
                          className={cn(
                            "text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                            isSelected
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <Package className="h-3 w-3 inline mr-1" />
                          {p.name}
                          {isSelected && <span className="ml-1">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button size="sm" className="h-9" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {audiences.length > 0 ? (
        <div className="space-y-2">
          {audiences.map((audience) => {
            const connectedProducts = products.filter(p => audience.productIds?.includes(p.id));
            return (
              <div key={audience.id} className="group rounded-xl border border-border/40 bg-card/50 hover:bg-card transition-colors cursor-pointer">
                <div className="flex items-center gap-3 px-4 py-3.5" onClick={() => setSelectedAudienceId(audience.id)}>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{audience.name}</p>
                    <p className="text-xs text-muted-foreground">Audience Segment · Updated {audience.lastUpdated}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70"><Lock className="h-2.5 w-2.5" />Private</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/70">Last updated: {audience.lastUpdated}</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground/70">Added by: {userName}</span>
                    </div>
                    {connectedProducts.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {connectedProducts.map(p => (
                          <span key={p.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            <Package className="h-2.5 w-2.5" /> {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(audience.id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
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
            <Users className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No audiences yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first audience segment to get started</p>
        </div>
      )}
    </div>
  );
}
