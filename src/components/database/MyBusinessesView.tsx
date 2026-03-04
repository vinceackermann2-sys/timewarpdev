import { useState, useEffect } from "react";
import { Plus, Search, Building2, Rocket, FolderOpenDot, Lock, Loader2, Trash2, Settings, ChevronsUpDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import startBusinessBg from "@/assets/start-business-bg.png";
import addBusinessBg from "@/assets/add-business-bg.png";
import { useBusinessDNA, BrandEntry } from "./BusinessDNAContext";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceDialog } from "./WorkspaceDialog";

interface MyBusinessesViewProps {
  onSelectBusiness: () => void;
  onOpenBusiness?: (brandId: string) => void;
}

export function MyBusinessesView({ onSelectBusiness, onOpenBusiness }: MyBusinessesViewProps) {
  const [search, setSearch] = useState("");
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const { brands, setBrands, products, setProducts, audiences, setAudiences, isLoading: dnaLoading } = useBusinessDNA();
  const {
    workspaces, activeWorkspaceId, activeWorkspace, selectWorkspace,
    members, isLoading: wsLoading,
  } = useWorkspace();
  const [wsBusinesses, setWsBusinesses] = useState<BrandEntry[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(false);

  // Load businesses for the active workspace
  useEffect(() => {
    if (!activeWorkspaceId) { setWsBusinesses([]); return; }

    async function load() {
      setLoadingBiz(true);
      const { data, error } = await supabase
        .from("user_business_data")
        .select("*")
        .eq("workspace_id", activeWorkspaceId!)
        .eq("data_type", "brand")
        .eq("source", "business-dna");

      if (!error && data) {
        const parsed = data.map((row) => {
          try {
            return { ...JSON.parse(row.content || "{}"), _rowId: row.id, _ownerId: row.user_id } as BrandEntry & { _ownerId: string };
          } catch { return null; }
        }).filter(Boolean) as (BrandEntry & { _ownerId: string })[];
        setWsBusinesses(parsed);
      }
      setLoadingBiz(false);
    }
    load();
  }, [activeWorkspaceId, brands]);

  const handleDeleteBusiness = (e: React.MouseEvent, brandId: string) => {
    e.stopPropagation();
    const brandProductIds = products.filter(p => p.brandId === brandId).map(p => p.id);
    setAudiences(prev => prev.filter(a => !a.productIds?.some(pid => brandProductIds.includes(pid))));
    setProducts(prev => prev.filter(p => p.brandId !== brandId));
    setBrands(prev => prev.filter(b => b.id !== brandId));
  };

  const isOwner = activeWorkspace?.role === "owner";
  const isLoading = wsLoading || (!activeWorkspaceId && workspaces.length === 0);

  // Show loader while workspace is being auto-selected
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredBrands = wsBusinesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full items-center">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50 space-y-4 w-full max-w-3xl">
        <div className="flex items-center gap-3">
          {/* Workspace Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-3 h-9 max-w-[220px]">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate text-sm font-semibold">{activeWorkspace?.workspaceName || "Workspace"}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map(ws => (
                <DropdownMenuItem
                  key={ws.workspaceId}
                  onClick={() => selectWorkspace(ws.workspaceId)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate text-sm">{ws.workspaceName}</span>
                    <span className="text-[10px] text-muted-foreground capitalize shrink-0">{ws.role}</span>
                  </div>
                  {ws.workspaceId === activeWorkspaceId && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {/* Manage button - owners only */}
          {isOwner && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowWorkspaceSettings(true)}>
              <Settings className="h-3.5 w-3.5" /> Manage
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/30 border-border/40"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 w-full max-w-3xl overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Add Business Card - only for owners */}
          {isOwner && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowOptionsDialog(true)}
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 bg-card/30 hover:bg-card/60 p-8 min-h-[200px] transition-colors cursor-pointer"
            >
              <div className="h-14 w-14 rounded-xl bg-muted/60 group-hover:bg-primary/10 border border-border/40 group-hover:border-primary/30 flex items-center justify-center transition-colors">
                <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Add Business
              </span>
            </motion.button>
          )}

          {/* Loading */}
          {loadingBiz && (
            <div className="flex items-center justify-center min-h-[200px] rounded-xl border border-border/30 bg-card/20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Business cards */}
          {filteredBrands.map((brand) => (
            <motion.button
              key={brand.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenBusiness?.(brand.id)}
              className="group relative flex flex-col items-start gap-3 rounded-xl border border-border/50 hover:border-primary/30 bg-card/50 hover:bg-card/80 p-6 min-h-[200px] transition-colors cursor-pointer text-left"
            >
              {/* Delete only for owners */}
              {isOwner && (
                <button
                  onClick={(e) => handleDeleteBusiness(e, brand.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete business"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary/70" />
              </div>
              <div className="mt-auto space-y-1">
                <h3 className="text-base font-semibold text-foreground">{brand.name}</h3>
                <p className="text-xs text-muted-foreground">{brand.category}</p>
                <p className="text-xs text-muted-foreground/60">Updated {brand.lastUpdated}</p>
              </div>
            </motion.button>
          ))}

          {!loadingBiz && filteredBrands.length === 0 && !isOwner && (
            <div className="col-span-2 text-center py-16 text-sm text-muted-foreground">
              No businesses in this workspace yet.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <WorkspaceFooter />

      {/* Options Dialog */}
      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-background border-border/50">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg">How would you like to get started?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 p-8 pt-4">
            <div className="relative rounded-xl border border-border/50 bg-card overflow-hidden opacity-75 cursor-not-allowed">
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/90 text-muted-foreground border border-border/50">
                  <Lock className="h-2.5 w-2.5" /> Coming Soon
                </span>
              </div>
              <div className="relative">
                <img src={addBusinessBg} alt="" className="w-full h-64 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="h-14 w-14 text-white drop-shadow-lg" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-foreground">From Scratch</h3>
                <p className="text-xs text-muted-foreground mt-1">Create from scratch with AI</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setShowOptionsDialog(false); onSelectBusiness(); }}
              className="rounded-xl border border-border/50 hover:border-primary/40 bg-card overflow-hidden transition-colors text-left cursor-pointer"
            >
              <div className="relative">
                <img src={startBusinessBg} alt="" className="w-full h-64 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FolderOpenDot className="h-14 w-14 text-white drop-shadow-lg" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-foreground">From Existing</h3>
                <p className="text-xs text-muted-foreground mt-1">Create from existing business</p>
              </div>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workspace Settings */}
      <WorkspaceDialog
        open={showWorkspaceSettings}
        onOpenChange={setShowWorkspaceSettings}
        userEmail={members.find(m => m.role === "owner")?.email || ""}
      />
    </div>
  );
}

function WorkspaceFooter() {
  return (
    <div className="w-full max-w-5xl mx-auto mb-6 mt-auto px-6">
      <div className="rounded-2xl border border-border/50 bg-muted/30 backdrop-blur-sm px-12 py-14">
        <div className="flex gap-14">
          <div className="flex items-start gap-2 shrink-0">
            <img src="/favicon.png" alt="TimeWarp" className="h-8 w-8 rounded-md" />
            <span className="font-semibold text-lg text-foreground">TimeWarp</span>
          </div>
          <div className="flex flex-wrap gap-14 flex-1">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Product</h4>
              <ul className="space-y-1.5">
                <li><a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Resources</h4>
              <ul className="space-y-1.5">
                <li><a href="mailto:support@nxtrinity.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Legal</h4>
              <ul className="space-y-1.5">
                <li><a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Community</h4>
              <ul className="space-y-1.5">
                <li><a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Discord</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-10 pt-5 border-t border-border/30">
          <p className="text-xs text-muted-foreground">© 2026 Nxtrinity AB, All rights reserved</p>
          <p className="text-xs text-muted-foreground">🇸🇪 Made in Sweden</p>
        </div>
      </div>
    </div>
  );
}
