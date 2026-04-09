import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Building2, Loader2, Trash2, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useBusinessDNA } from "./BusinessDNAContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { UpgradeGateDialog } from "./UpgradeGateDialog";
import { useFreePlanGate } from "@/hooks/useFreePlanGate";
import { WorkspaceFooter as WorkspaceFooterShared } from "./WorkspaceFooter";

interface MyBusinessesViewProps {
  onSelectBusiness: () => void;
  onOpenBusiness?: (brandId: string) => void;
  onManageWorkspace?: () => void;
}

export function MyBusinessesView({ onSelectBusiness, onOpenBusiness, onManageWorkspace }: MyBusinessesViewProps) {
  const [search, setSearch] = useState("");
  const { isFreeUser, showGate, openGate, closeGate } = useFreePlanGate();
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const { brands, deleteBrand, isLoading: dnaLoading } = useBusinessDNA();
  const {
    workspaces, activeWorkspaceId, activeWorkspace,
    members, isLoading: wsLoading,
  } = useWorkspace();
  const lastKnownCount = useRef(0);

  useEffect(() => {
    if (brands.length > 0) {
      lastKnownCount.current = brands.length;
    }
  }, [brands]);

  const isOwner = activeWorkspace?.role === "owner";
  const isLoading = wsLoading && !activeWorkspaceId;
  const loadingBiz = dnaLoading && brands.length === 0;

  // Show loader while workspace is being auto-selected
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteBusiness = async (e: React.MouseEvent, brandId: string) => {
    e.stopPropagation();
    await deleteBrand(brandId);
  };

  return (
    <>
    <div className="flex flex-col h-full items-center overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50 space-y-4 w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{activeWorkspace?.workspaceName || "Workspace"}</h2>
          <div className="flex-1" />

          {/* Manage button - owners only */}
          {isOwner && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onManageWorkspace ? onManageWorkspace() : setShowWorkspaceSettings(true)}>
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
                if (isFreeUser && brands.length >= 1) { openGate(); return; }
                onSelectBusiness();
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

      {/* Footer - hidden on mobile to save space */}
      <div className="hidden md:block">
        <WorkspaceFooterShared compact />
      </div>


      {/* Workspace Settings */}
      <WorkspaceDialog
        open={showWorkspaceSettings}
        onOpenChange={setShowWorkspaceSettings}
        userEmail={members.find(m => m.role === "owner")?.email || ""}
        initialWorkspaceId={activeWorkspaceId || undefined}
      />
      <UpgradeGateDialog open={showGate} onOpenChange={closeGate} />
    </div>
    </>
  );
}

