import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Building2, Rocket, FolderOpenDot, Lock, Loader2, Trash2, Settings, ChevronsUpDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import startBusinessBg from "@/assets/start-business-bg.png";
import addBusinessBg from "@/assets/add-business-bg.png";
import { useBusinessDNA, BrandEntry } from "./BusinessDNAContext";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { UpgradeGateDialog } from "./UpgradeGateDialog";
import { useFreePlanGate } from "@/hooks/useFreePlanGate";

interface MyBusinessesViewProps {
  onSelectBusiness: () => void;
  onOpenBusiness?: (brandId: string) => void;
}

export function MyBusinessesView({ onSelectBusiness, onOpenBusiness }: MyBusinessesViewProps) {
  const [search, setSearch] = useState("");
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const { isFreeUser, showGate, openGate, closeGate } = useFreePlanGate();
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [wsSearch, setWsSearch] = useState("");
  const [wsPopoverOpen, setWsPopoverOpen] = useState(false);
  const [showNewWsInput, setShowNewWsInput] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const { brands, setBrands, products, setProducts, audiences, setAudiences, deleteBrand, isLoading: dnaLoading } = useBusinessDNA();
  const {
    workspaces, activeWorkspaceId, activeWorkspace, selectWorkspace, createWorkspace,
    members, isLoading: wsLoading,
  } = useWorkspace();
  const [wsBusinesses, setWsBusinesses] = useState<BrandEntry[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const lastKnownCount = useRef(0);
  const prevWorkspaceId = useRef<string | null>(null);

  // Load businesses for the active workspace
  useEffect(() => {
    if (!activeWorkspaceId) {
      setWsBusinesses([]);
      if (!wsLoading) setLoadingBiz(false);
      return;
    }

    setWsBusinesses([]);
    setLoadingBiz(true);
    prevWorkspaceId.current = activeWorkspaceId;

    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("user_business_data")
        .select("id, content, user_id")
        .eq("workspace_id", activeWorkspaceId!)
        .eq("data_type", "brand")
        .eq("source", "business-dna");

      if (cancelled) return;
      if (!error && data) {
        const parsed = data.map((row) => {
          try {
            return { ...JSON.parse(row.content || "{}"), _rowId: row.id, _ownerId: row.user_id } as BrandEntry & { _ownerId: string };
          } catch { return null; }
        }).filter(Boolean) as (BrandEntry & { _ownerId: string })[];
        lastKnownCount.current = parsed.length;
        setWsBusinesses(parsed);
      }
      setLoadingBiz(false);
    }
    load();
    return () => { cancelled = true; };
  }, [activeWorkspaceId, brands, wsLoading]);

  const handleDeleteBusiness = async (e: React.MouseEvent, brandId: string) => {
    e.stopPropagation();
    await deleteBrand(brandId);
  };

  const isOwner = activeWorkspace?.role === "owner";
  const isLoading = wsLoading && !activeWorkspaceId;

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
    <>
    <div className="flex flex-col h-full items-center">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50 space-y-4 w-full max-w-3xl">
        <div className="flex items-center gap-3">
          {/* Workspace Switcher */}
          <Popover open={wsPopoverOpen} onOpenChange={setWsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="gap-2 px-3 h-9 max-w-[220px]">
                <div className="h-6 w-6 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-background">
                    {(activeWorkspace?.workspaceName || "W").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="truncate text-sm font-semibold">{activeWorkspace?.workspaceName || "Workspace"}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Find workspace..."
                  value={wsSearch}
                  onChange={(e) => setWsSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              {/* Workspace list */}
              <div className="py-1.5 max-h-[200px] overflow-y-auto">
                {workspaces
                  .filter(ws => ws.workspaceName.toLowerCase().includes(wsSearch.toLowerCase()))
                  .map(ws => (
                    <button
                      key={ws.workspaceId}
                      onClick={() => { selectWorkspace(ws.workspaceId); setWsPopoverOpen(false); setWsSearch(""); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-background">
                          {ws.workspaceName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{ws.workspaceName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {ws.memberCount > 1 ? "Team workspace" : "Personal workspace"}
                        </p>
                      </div>
                      {ws.workspaceId === activeWorkspaceId && (
                        <Check className="h-4 w-4 text-foreground shrink-0" />
                      )}
                    </button>
                  ))}
              </div>

              {/* Footer actions */}
              <div className="border-t border-border/50 py-1.5">
                <button
                  onClick={() => { setWsPopoverOpen(false); setShowWorkspaceSettings(true); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-foreground"
                >
                  See all workspaces
                </button>
                {showNewWsInput ? (
                  <div className="px-3 py-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Workspace name"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && newWsName.trim()) {
                          const id = await createWorkspace(newWsName.trim());
                          selectWorkspace(id);
                          setNewWsName("");
                          setShowNewWsInput(false);
                          setWsPopoverOpen(false);
                        }
                      }}
                      autoFocus
                      className="flex-1 bg-transparent text-sm outline-none border-b border-border pb-0.5 placeholder:text-muted-foreground"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewWsInput(true)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-foreground flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add new workspace
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

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
              onClick={() => {
                if (isFreeUser && wsBusinesses.length >= 1) { openGate(); return; }
                setShowOptionsDialog(true);
              }}
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

          {/* Loading skeletons */}
          {loadingBiz && Array.from({ length: Math.max(lastKnownCount.current, 1) }).map((_, i) => (
            <div key={`skel-${i}`} className="flex flex-col items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-6 min-h-[200px]">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="mt-auto space-y-2 w-full">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}

          {/* Business cards — hide while loading to prevent stale data */}
          {!loadingBiz && filteredBrands.map((brand) => (
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
              {brand.logoUrls && brand.logoUrls.length > 0 ? (
                <img
                  src={brand.logoUrls[brand.selectedLogo ?? 0]}
                  alt={brand.name}
                  className="h-12 w-12 rounded-xl object-contain border border-border/30 bg-white"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary/70" />
                </div>
              )}
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
    <div className="w-full mx-auto mb-6 mt-auto px-4 sm:px-6" style={{ maxWidth: 1900 }}>
      <div className="rounded-2xl border border-border/50 bg-muted/30 backdrop-blur-sm px-5 sm:px-12 py-8 sm:py-14">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-14">
          <div className="flex items-start gap-2 shrink-0">
            <img src="/favicon.png" alt="TimeWarp" className="h-10 w-10 rounded-md" />
            <span className="font-semibold text-xl text-foreground">TimeWarp</span>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-6 sm:gap-14 flex-1">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground" style={{ fontSize: 16 }}>Product</h4>
              <ul className="space-y-1.5">
                <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>Pricing</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground" style={{ fontSize: 16 }}>Resources</h4>
              <ul className="space-y-1.5">
                <li><Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>Support</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground" style={{ fontSize: 16 }}>Legal</h4>
              <ul className="space-y-1.5">
                <li><Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>Privacy Policy</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground" style={{ fontSize: 16 }}>Community</h4>
              <ul className="space-y-1.5">
                <li><a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>Discord</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-10 pt-5 border-t border-border/30">
          <p className="text-muted-foreground text-center sm:text-left" style={{ fontSize: 14 }}>© 2026 Vincent Ackermann, All rights reserved</p>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>🇸🇪 Made in Sweden</p>
        </div>
      </div>
    </div>
      <UpgradeGateDialog open={showGate} onOpenChange={closeGate} />
    </>
  );
}
