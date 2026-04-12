import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandingEditor } from "@/components/database/BrandingEditor";
import { BrandExtendedSections } from "@/components/database/BrandExtendedSections";
import { BrandPageSidebar } from "@/components/database/BrandPageSidebar";
import { useToast } from "@/hooks/use-toast";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { Skeleton } from "@/components/ui/skeleton";

function BrandSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-8">
        <div className="flex-1 min-w-0 space-y-6">
          {/* Branding editor skeleton */}
          <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-16 rounded-lg" />
              ))}
            </div>
          </div>
          {/* Extended sections skeleton */}
          <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="hidden lg:block w-52 shrink-0 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExtendedSectionsSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden p-6 space-y-6">
      {/* Moodboard skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      {/* Illustrations skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      {/* Screenshots skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-32 flex-1 rounded-lg animate-pulse" />
          <Skeleton className="h-32 w-20 rounded-lg animate-pulse" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center animate-pulse">
        Generating visual assets — this may take a moment…
      </p>
    </div>
  );
}

/** Check if the brand's visual identity has been enriched with images */
function isBrandEnriched(brand: any): boolean {
  const vi = brand?.visualIdentity;
  if (!vi) return false;
  const hasMoodboard = Array.isArray(vi.moodboardUrls) && vi.moodboardUrls.length > 0;
  const hasIllustrations = (Array.isArray(vi.illustrationIconNames) && vi.illustrationIconNames.length > 0)
    || (Array.isArray(vi.illustrationSvgs) && vi.illustrationSvgs.length > 0);
  return hasMoodboard || hasIllustrations;
}

export function BrandListView({ activeBrandId }: { activeBrandId: string }) {
  const { brands, setBrands, isLoading, refreshBrand } = useBusinessDNA();
  const [isBrandingEditing, setIsBrandingEditing] = useState(false);
  const [isVisualIdentityEditing, setIsVisualIdentityEditing] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState<string>("branding");
  const { toast } = useToast();

  const selectedBrand = brands.find(b => b.id === activeBrandId);
  const enriched = selectedBrand ? isBrandEnriched(selectedBrand) : false;
  const rowId = (selectedBrand as any)?._rowId;

  // Listen for realtime updates on the brand row when enrichment hasn't completed yet
  useEffect(() => {
    if (!rowId || enriched || !refreshBrand) return;

    const channel = supabase
      .channel(`brand-enrich-${rowId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_business_data',
          filter: `id=eq.${rowId}`,
        },
        () => {
          // Brand row was updated (likely by enrich-brand) — refresh context
          refreshBrand(activeBrandId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rowId, enriched, activeBrandId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return <BrandSkeleton />;
  }

  if (selectedBrand) {
    return (
      <div className="space-y-0">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <BrandingEditor
                brandId={selectedBrand.id}
                brandRowId={(selectedBrand as any)._rowId}
                isEditing={isBrandingEditing}
                onEditToggle={() => setIsBrandingEditing(!isBrandingEditing)}
                onCancel={() => setIsBrandingEditing(false)}
                onSave={(data) => {
                  // Persist branding back to context
                   setBrands(prev => prev.map(b => b.id === activeBrandId ? {
                    ...b,
                    colors: data.colors,
                    typography: data.typography,
                    logoUrls: data.logos,
                    selectedLogo: data.selectedLogo,
                  } : b));
                  toast({ title: "Branding saved" });
                }}
                initialColors={selectedBrand.colors}
                initialTypography={selectedBrand.typography}
                initialLogos={selectedBrand.logoUrls}
                initialSelectedLogo={selectedBrand.selectedLogo}
                onVisualIdentityExtracted={(vi) => {
                  setBrands(prev => prev.map(b => b.id === activeBrandId ? {
                    ...b,
                    visualIdentity: { ...b.visualIdentity, ...vi },
                  } : b));
                }}
              />
            </div>
            {enriched ? (
              <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden" id="extended-brand">
                <BrandExtendedSections
                  key={selectedBrand.id}
                  isEditing={isVisualIdentityEditing}
                  onEditToggle={() => setIsVisualIdentityEditing(!isVisualIdentityEditing)}
                  initialData={selectedBrand.visualIdentity}
                  brandColors={selectedBrand.colors}
                  onSave={(viData) => {
                    setBrands(prev => prev.map(b => b.id === activeBrandId ? {
                      ...b,
                      visualIdentity: viData,
                    } : b));
                    toast({ title: "Visual identity saved" });
                  }}
                />
              </div>
            ) : (
              <ExtendedSectionsSkeleton />
            )}
          </div>
          <div className="hidden lg:block w-52 shrink-0">
            <BrandPageSidebar brandName={selectedBrand.name} activeSection={activeSidebarSection} onSectionClick={(id) => { setActiveSidebarSection(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3"><Palette className="h-6 w-6 text-foreground" /></div>
      <p className="text-sm text-muted-foreground">No brand data yet</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Import a business to populate brand data</p>
    </div>
  );
}
