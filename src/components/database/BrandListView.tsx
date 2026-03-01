import { useState, useEffect } from "react";
import { Palette, Plus, Trash2, ChevronRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandingEditor } from "@/components/database/BrandingEditor";
import { BrandExtendedSections } from "@/components/database/BrandExtendedSections";
import { BrandPageSidebar } from "@/components/database/BrandPageSidebar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface BrandEntry {
  id: string;
  name: string;
  category: string;
  lastUpdated: string;
}

export function BrandListView() {
  const [userName, setUserName] = useState("Unknown");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Unknown");
      }
    });
  }, []);

  const [brands, setBrands] = useState<BrandEntry[]>([
    {
      id: "example-1",
      name: "FlawSkin Beauty",
      category: "Beauty & Wellness",
      lastUpdated: "Feb 28, 2026",
    },
  ]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  // Brand detail editing state
  const [isBrandingEditing, setIsBrandingEditing] = useState(false);
  const [isVisualIdentityEditing, setIsVisualIdentityEditing] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState<string>("branding");
  const { toast } = useToast();

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

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

  if (selectedBrand) {
    return (
      <div className="space-y-0">
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setSelectedBrandId(null)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <h3 className="text-base font-semibold text-foreground">{selectedBrand.name}</h3>
        </div>
        <div className="flex gap-8">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <BrandingEditor
                isEditing={isBrandingEditing}
                onEditToggle={() => setIsBrandingEditing(!isBrandingEditing)}
                onCancel={() => setIsBrandingEditing(false)}
                onSave={() => {
                  toast({ title: "Branding saved" });
                }}
              />
            </div>
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden" id="extended-brand">
              <BrandExtendedSections
                isEditing={isVisualIdentityEditing}
                onEditToggle={() => setIsVisualIdentityEditing(!isVisualIdentityEditing)}
              />
            </div>
          </div>
          <div className="hidden lg:block w-52 shrink-0 self-start">
            <BrandPageSidebar
              activeSection={activeSidebarSection}
              onSectionClick={(id) => {
                setActiveSidebarSection(id);
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
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
          <p className="text-xs text-muted-foreground mt-0.5">
            {brands.length} brand{brands.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? <span>Cancel</span> : <><Plus className="h-3.5 w-3.5" /> New Brand</>}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Brand Name</label>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. My Skincare Brand"
                  className="h-9 text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <Button size="sm" className="h-9" onClick={handleCreate} disabled={!newName.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {brands.length > 0 ? (
        <div className="space-y-2">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="group rounded-xl border border-border/40 bg-card/50 hover:bg-card transition-colors cursor-pointer"
            >
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
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(brand.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Palette className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No brands yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first brand to get started</p>
        </div>
      )}
    </div>
  );
}
