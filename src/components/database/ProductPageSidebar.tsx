import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

const PRODUCT_TOC_ITEMS: TocItem[] = [
  { id: "product-overview", title: "Product overview", level: 1 },
  { id: "product-description", title: "Product description", level: 2 },
  { id: "key-features", title: "Key features", level: 2 },
  { id: "key-benefits", title: "Key benefits", level: 2 },
  { id: "target-pain-points", title: "Target pain points", level: 2 },
  { id: "primary-use-cases", title: "Primary use cases", level: 2 },
  { id: "target-scenarios", title: "Target scenarios", level: 2 },
  { id: "value-proposition", title: "Value proposition", level: 1 },
  { id: "positioning-statement", title: "Positioning statement", level: 2 },
  { id: "unique-selling-points", title: "Unique selling points", level: 2 },
  { id: "competitive-advantages", title: "Competitive advantages", level: 2 },
  { id: "objections-proof", title: "Objections & proof points", level: 1 },
  { id: "common-objections", title: "Common objections and responses", level: 2 },
  { id: "proof-points", title: "Proof points and evidence types", level: 2 },
  { id: "language-patterns", title: "Language patterns", level: 1 },
  { id: "dos-and-donts", title: "Do's and Don'ts", level: 2 },
  { id: "power-phrases", title: "Power phrases", level: 2 },
  { id: "power-words", title: "Power words", level: 2 },
  { id: "technical-level", title: "Technical level", level: 2 },
  { id: "content-refinement", title: "Content refinement", level: 1 },
  { id: "refinement-checklist", title: "Refinement checklist", level: 2 },
];

const ITEM_HEIGHT = 32;
const TOP_PAD = 12;

export function ProductPageSidebar({
  itemName,
  activeSection,
  onSectionClick,
}: {
  itemName?: string;
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [indicatorTop, setIndicatorTop] = useState(TOP_PAD);

  useEffect(() => {
    const idx = PRODUCT_TOC_ITEMS.findIndex((i) => i.id === activeSection);
    if (idx !== -1) {
      setIndicatorTop(TOP_PAD + idx * ITEM_HEIGHT);
    }
  }, [activeSection]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSection]);

  const totalHeight = PRODUCT_TOC_ITEMS.length * ITEM_HEIGHT + TOP_PAD * 2;

  return (
    <nav
      ref={navRef}
    >
      {itemName && (
        <p className="text-[11px] text-muted-foreground/70 mb-2 truncate">Business DNA › {itemName}</p>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-3">On This Page</h3>
      <div className="relative" style={{ height: totalHeight }}>
        {/* Background vertical line */}
        <div
          className="absolute w-px bg-border/60"
          style={{ left: 3, top: TOP_PAD, bottom: TOP_PAD }}
        />

        {/* Active indicator — animated accent line */}
        <div
          className="absolute w-[2px] rounded-full bg-primary transition-all duration-200 ease-out"
          style={{ left: 2.5, top: indicatorTop, height: 20 }}
        />

        {/* Items */}
        <div className="relative">
          {PRODUCT_TOC_ITEMS.map((item, index) => {
            const isActive = activeSection === item.id;
            const paddingLeft = item.level === 1 ? 14 : 26;

            return (
              <a
                key={item.id}
                ref={isActive ? activeRef : undefined}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSectionClick?.(item.id);
                }}
                data-active={isActive}
                className={cn(
                  "relative block py-1.5 text-sm transition-colors",
                  "hover:text-accent-foreground",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
                style={{ paddingInlineStart: paddingLeft }}
              >
                {item.title}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
