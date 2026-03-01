import { cn } from "@/lib/utils";

interface SidebarSection {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

const PRODUCT_SECTIONS: SidebarSection[] = [
  {
    id: "product-overview",
    label: "Overview",
    children: [
      { id: "product-name", label: "Name & Category" },
      { id: "product-description", label: "Description" },
      { id: "product-pricing", label: "Pricing" },
    ],
  },
  {
    id: "product-features",
    label: "Features & Benefits",
    children: [
      { id: "key-features", label: "Key Features" },
      { id: "unique-benefits", label: "Unique Benefits" },
    ],
  },
  {
    id: "product-audience",
    label: "Target Audience",
    children: [
      { id: "ideal-customer", label: "Ideal Customer" },
      { id: "pain-points", label: "Pain Points" },
      { id: "use-cases", label: "Use Cases" },
    ],
  },
  {
    id: "product-competitive",
    label: "Competitive Edge",
    children: [
      { id: "differentiators", label: "Differentiators" },
      { id: "competitors", label: "Competitors" },
    ],
  },
];

export function ProductPageSidebar({
  activeSection,
  onSectionClick,
}: {
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}) {
  return (
    <nav className="sticky top-6 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">On This Page</h3>
      <div className="space-y-1">
        {PRODUCT_SECTIONS.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => onSectionClick?.(section.id)}
              className={cn(
                "flex items-center gap-2 w-full text-left py-1.5 text-sm transition-colors",
                activeSection === section.id
                  ? "text-primary font-medium"
                  : "text-foreground/80 hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-0.5 h-5 rounded-full transition-colors shrink-0",
                activeSection === section.id ? "bg-primary" : "bg-transparent"
              )} />
              {section.label}
            </button>

            {section.children && (
              <div className="ml-3 border-l border-border/40 pl-3 space-y-0.5">
                {section.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSectionClick?.(child.id)}
                    className={cn(
                      "block w-full text-left py-1.5 text-sm transition-colors",
                      activeSection === child.id
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
