import { cn } from "@/lib/utils";

interface SidebarItem {
  id: string;
  label: string;
  indent?: boolean;
}

const PRODUCT_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "product-overview", label: "Product overview" },
  { id: "product-description", label: "Product description", indent: true },
  { id: "key-features", label: "Key features" },
  { id: "key-benefits", label: "Key benefits" },
  { id: "target-pain-points", label: "Target pain points" },
  { id: "primary-use-cases", label: "Primary use cases" },
  { id: "target-scenarios", label: "Target scenarios" },
  { id: "product-offers", label: "Offers" },
  { id: "value-proposition", label: "Value proposition" },
  { id: "positioning-statement", label: "Positioning statement", indent: true },
  { id: "unique-selling-points", label: "Unique selling points", indent: true },
  { id: "competitive-advantages", label: "Competitive advantages", indent: true },
  { id: "objections-proof", label: "Objections & proof points" },
  { id: "common-objections", label: "Common objections and responses", indent: true },
  { id: "proof-points", label: "Proof points and evidence types", indent: true },
  { id: "language-patterns", label: "Language patterns" },
  { id: "dos-and-donts", label: "Do's and Don'ts", indent: true },
  { id: "power-phrases", label: "Power phrases", indent: true },
  { id: "power-words", label: "Power words", indent: true },
  { id: "technical-level", label: "Technical level", indent: true },
  { id: "content-refinement", label: "Content refinement" },
  { id: "refinement-checklist", label: "Refinement checklist", indent: true },
];

export function ProductPageSidebar({
  activeSection,
  onSectionClick,
}: {
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}) {
  return (
    <nav className="sticky top-6 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">On This Page</h3>
      <div className="space-y-0.5">
        {PRODUCT_SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionClick?.(item.id)}
            className={cn(
              "flex items-center gap-2 w-full text-left py-1.5 text-sm transition-colors",
              item.indent && "pl-4",
              activeSection === item.id
                ? "text-primary font-medium"
                : item.indent
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-foreground/80 hover:text-foreground"
            )}
          >
            {!item.indent && (
              <div
                className={cn(
                  "w-0.5 h-5 rounded-full transition-colors shrink-0",
                  activeSection === item.id ? "bg-primary" : "bg-transparent"
                )}
              />
            )}
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
