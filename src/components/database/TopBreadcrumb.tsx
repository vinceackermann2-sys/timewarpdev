import { useState } from "react";
import { ChevronsUpDown, Check, Search, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBusinessDNA, BrandEntry } from "@/components/database/BusinessDNAContext";

type View = "aiceo" | "businessdna" | "employees" | "workspaces" | "connections" | "manage";

const VIEW_LABELS: Record<View, string> = {
  aiceo: "AI CEO",
  businessdna: "Business DNA",
  employees: "Assistant",
  workspaces: "Workspaces",
  connections: "Connectors",
  manage: "Dashboard",
};

interface TopBreadcrumbProps {
  currentView: View;
  activeBrandId?: string | null;
  onSelectBrand?: (brandId: string) => void;
}

export function TopBreadcrumb({ currentView, activeBrandId, onSelectBrand }: TopBreadcrumbProps) {
  const { brands } = useBusinessDNA();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const activeBrand = brands.find(b => b.id === activeBrandId) || brands[0] || null;
  const displayName = activeBrand?.name || "Select business";

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="hidden md:flex items-center gap-2 px-4 h-10 bg-sidebar text-sm shrink-0 rounded-t-xl">
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
            {filtered.map(brand => (
              <button
                key={brand.id}
                onClick={() => {
                  onSelectBrand?.(brand.id);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors text-sm"
              >
                <span className="truncate flex-1 text-left">{brand.name}</span>
                {brand.id === activeBrand?.id && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">/</span>
      <span className="text-foreground font-medium">{VIEW_LABELS[currentView]}</span>
    </div>
  );
}
