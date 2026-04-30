import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";

const ROUTE_LABELS: Record<string, string> = {
  assistant: "Assistant",
  dashboard: "Dashboard",
  dna: "Business DNA",
  employees: "Employees",
  agents: "Agents",
  connections: "Connectors",
  workspaces: "Workspaces",
  settings: "Settings",
};

const PILLAR_LABELS: Record<string, string> = {
  brand: "Brand",
  product: "Product",
  audience: "Audience",
  market: "Market",
  financial: "Financial",
  operations: "Operations",
  people: "People",
  growth: "Growth",
  strategy: "Strategy",
};

/**
 * AppTopBreadcrumb — renders "[business] / [section] / [pillar?]".
 *
 * Picks up the active section from the URL (no prop drilling) and lets the
 * user switch businesses by routing into the same section under a different
 * brandId where applicable.
 */
export function AppTopBreadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { brands, isLoading } = useBusinessDNA();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const segments = location.pathname.split("/").filter(Boolean); // ["app", "section", ...]
  const sectionKey = segments[1] || "assistant";
  const sectionLabel = ROUTE_LABELS[sectionKey] || "Assistant";

  // For DNA, the URL is /app/dna/:brandId or /app/dna/:brandId/:pillar.
  const dnaBrandId = sectionKey === "dna" ? (params.brandId || segments[2]) : null;
  const dnaPillar = sectionKey === "dna" ? (params.pillar || segments[3]) : null;

  const activeBrand = useMemo(
    () =>
      brands.find((b) => b.id === dnaBrandId) ||
      brands[0] ||
      null,
    [brands, dnaBrandId],
  );
  const displayName = activeBrand?.name || "Select business";
  const showSkeleton = isLoading && !activeBrand;

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handlePickBrand = (brandId: string) => {
    setOpen(false);
    setSearch("");
    // If we're already on a per-brand DNA page, navigate to the same brand's
    // detail page so the URL stays canonical. Otherwise just remember the
    // selection for next time DNA is opened.
    if (sectionKey === "dna") {
      navigate(`/app/dna/${brandId}`);
    } else {
      // Persist for legacy code paths that read tw_active_brand_id.
      localStorage.setItem("tw_active_brand_id", brandId);
    }
  };

  return (
    <div className="hidden md:flex items-center gap-2 px-4 h-12 text-sm shrink-0 bg-background">
      {showSkeleton ? (
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32 rounded-md" />
          <span className="text-muted-foreground">/</span>
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-muted/50 transition-colors text-foreground font-medium">
              {displayName}
              <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-60 p-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Find business..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="py-1.5 max-h-[240px] overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No businesses found</p>
              )}
              {filtered.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => handlePickBrand(brand.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors text-sm"
                >
                  <span className="truncate flex-1 text-left">{brand.name}</span>
                  {brand.id === activeBrand?.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <span className="text-muted-foreground">/</span>
      <span className="text-foreground font-medium">{sectionLabel}</span>

      {dnaPillar && PILLAR_LABELS[dnaPillar] && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{PILLAR_LABELS[dnaPillar]}</span>
        </>
      )}
    </div>
  );
}
