import { cn } from "@/lib/utils";

interface SidebarItem {
  id: string;
  label: string;
  indent?: boolean;
  highlight?: boolean; // primary colored parent
}

const PRODUCT_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "product-overview", label: "Product overview" },
  { id: "product-description", label: "Product description", indent: true },
  { id: "key-features", label: "Key features", indent: true },
  { id: "key-benefits", label: "Key benefits", indent: true },
  { id: "target-pain-points", label: "Target pain points", indent: true },
  { id: "primary-use-cases", label: "Primary use cases", indent: true },
  { id: "target-scenarios", label: "Target scenarios", indent: true },
  { id: "value-proposition", label: "Value proposition" },
  { id: "positioning-statement", label: "Positioning statement", indent: true },
  { id: "unique-selling-points", label: "Unique selling points", indent: true },
  { id: "competitive-advantages", label: "Competitive advantages", indent: true },
  { id: "objections-proof", label: "Objections & proof points" },
  { id: "common-objections", label: "Common objections and responses", indent: true },
  { id: "proof-points", label: "Proof points and evidence types", indent: true },
  { id: "language-patterns", label: "Language patterns", highlight: true },
  { id: "dos-and-donts", label: "Do's and Don'ts", indent: true, highlight: true },
  { id: "power-phrases", label: "Power phrases", indent: true, highlight: true },
  { id: "power-words", label: "Power words", indent: true, highlight: true },
  { id: "technical-level", label: "Technical level", indent: true },
  { id: "content-refinement", label: "Content refinement", highlight: true },
  { id: "refinement-checklist", label: "Refinement checklist", indent: true, highlight: true },
];

export function ProductPageSidebar({
  activeSection,
  onSectionClick,
}: {
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}) {
  return (
    <nav className="sticky top-6 self-start space-y-3">
      <h3 className="text-sm font-semibold text-foreground">On This Page</h3>
      <div className="relative">
        {/* Continuous vertical line */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-border/40 rounded-full" />
        <div className="space-y-0.5">
          {PRODUCT_SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionClick?.(item.id)}
              className={cn(
                "flex items-center w-full text-left py-1.5 text-sm transition-colors relative",
                item.indent ? "pl-5 ml-0" : "pl-3",
                activeSection === item.id
                  ? "text-primary font-medium"
                  : item.indent
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-foreground/80 hover:text-foreground"
              )}
            >
              {/* Line bump indicator for parent items */}
              {!item.indent && (
                <div
                  className={cn(
                    "absolute left-[-3px] top-1/2 -translate-y-1/2 w-[8px] h-[2px] rounded-r-full transition-colors z-10",
                    activeSection === item.id
                      ? "bg-primary"
                      : "bg-border"
                  )}
                />
              )}
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
