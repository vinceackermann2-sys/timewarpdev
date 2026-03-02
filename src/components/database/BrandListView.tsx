import { useState } from "react";
import { Palette } from "lucide-react";
import { BrandingEditor } from "@/components/database/BrandingEditor";
import { BrandExtendedSections } from "@/components/database/BrandExtendedSections";
import { BrandPageSidebar } from "@/components/database/BrandPageSidebar";
import { useToast } from "@/hooks/use-toast";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";

export function BrandListView({ activeBrandId }: { activeBrandId: string }) {
  const { brands, setBrands } = useBusinessDNA();
  const [isBrandingEditing, setIsBrandingEditing] = useState(false);
  const [isVisualIdentityEditing, setIsVisualIdentityEditing] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState<string>("branding");
  const { toast } = useToast();

  const selectedBrand = brands.find(b => b.id === activeBrandId);

  if (selectedBrand) {
    return (
      <div className="space-y-0">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <BrandingEditor
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
              />
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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Palette className="h-6 w-6 text-primary" /></div>
      <p className="text-sm text-muted-foreground">No brand data yet</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Import a business to populate brand data</p>
    </div>
  );
}
