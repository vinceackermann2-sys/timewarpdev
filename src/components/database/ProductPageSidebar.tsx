import { useCallback, useEffect, useRef, useState } from "react";

interface SidebarItem {
  id: string;
  label: string;
  indent?: boolean;
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
  { id: "language-patterns", label: "Language patterns" },
  { id: "dos-and-donts", label: "Do's and Don'ts", indent: true },
  { id: "power-phrases", label: "Power phrases", indent: true },
  { id: "power-words", label: "Power words", indent: true },
  { id: "technical-level", label: "Technical level", indent: true },
  { id: "content-refinement", label: "Content refinement" },
  { id: "refinement-checklist", label: "Refinement checklist", indent: true },
];

const ITEM_HEIGHT = 32;

function buildSvgPath(items: SidebarItem[]): string {
  const parts: string[] = [];
  let prevIndent = false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isIndent = !!item.indent;
    const y = i * ITEM_HEIGHT + ITEM_HEIGHT / 2;
    const nextItem = items[i + 1];
    const nextIndent = nextItem ? !!nextItem.indent : false;

    if (i === 0) {
      // Start
      parts.push(`M${isIndent ? 11 : 1} ${y}`);
    } else {
      const prevY = (i - 1) * ITEM_HEIGHT + ITEM_HEIGHT / 2;
      if (!prevIndent && isIndent) {
        // Parent → child: diagonal from x=1 to x=11
        parts.push(`L1 ${prevY}`);
        parts.push(`L11 ${y}`);
      } else if (prevIndent && !isIndent) {
        // Child → parent: diagonal from x=11 to x=1
        parts.push(`L11 ${prevY}`);
        parts.push(`L1 ${y}`);
      } else {
        // Same level: vertical
        const x = isIndent ? 11 : 1;
        parts.push(`L${x} ${y}`);
      }
    }

    // If this is the last item or level changes next, cap the line
    if (!nextItem) {
      const x = isIndent ? 11 : 1;
      parts.push(`L${x} ${y}`);
    }

    prevIndent = isIndent;
  }

  return parts.join(" ");
}

export function ProductPageSidebar({
  activeSection,
  onSectionClick,
}: {
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [tocTop, setTocTop] = useState(0);
  const [tocHeight, setTocHeight] = useState(0);

  const setItemRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (!activeSection || !containerRef.current) return;
    const el = itemRefs.current.get(activeSection);
    if (!el) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    const elRect = el.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    setTocTop(elRect.top - containerTop + scrollTop);
    setTocHeight(elRect.height);
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSection]);

  const svgPath = buildSvgPath(PRODUCT_SIDEBAR_ITEMS);
  const totalHeight = PRODUCT_SIDEBAR_ITEMS.length * ITEM_HEIGHT;

  return (
    <nav className="sticky top-6 max-h-[calc(100vh-3rem)]">
      <h3 className="text-sm font-semibold text-foreground mb-3">On This Page</h3>
      <div
        ref={containerRef}
        className="relative min-h-0 text-sm overflow-auto [scrollbar-width:none] [mask-image:linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent)] py-3"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {/* SVG tree path with sliding indicator */}
        <div
          className="absolute start-0 top-0"
          style={{ width: 12, height: totalHeight }}
        >
          {/* Tree path mask */}
          <div
            className="absolute inset-0"
            style={{
              maskImage: `url("data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 ${totalHeight}"><path d="${svgPath}" stroke="black" stroke-width="1" fill="none" /></svg>`
              )}")`,
              WebkitMaskImage: `url("data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 ${totalHeight}"><path d="${svgPath}" stroke="black" stroke-width="1" fill="none" /></svg>`
              )}")`,
            }}
          >
            {/* Background line */}
            <div className="absolute inset-0 bg-foreground/10" />
            {/* Active indicator */}
            <div
              className="bg-primary transition-all duration-300"
              style={{
                marginTop: tocTop,
                height: tocHeight,
              }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex flex-col">
          {PRODUCT_SIDEBAR_ITEMS.map((item, i) => {
            const isActive = activeSection === item.id;
            const prevItem = PRODUCT_SIDEBAR_ITEMS[i - 1];
            const nextItem = PRODUCT_SIDEBAR_ITEMS[i + 1];
            const prevIndent = prevItem ? !!prevItem.indent : false;
            const nextIndent = nextItem ? !!nextItem.indent : false;
            const isIndent = !!item.indent;

            // Determine which connectors to show
            const showDiagonalDown = !prevIndent && isIndent && i > 0; // parent → child
            const showDiagonalUp = prevIndent && !isIndent && i > 0; // child → parent
            const isFirstChild = showDiagonalDown;
            const isLastChild = isIndent && !nextIndent;

            return (
              <button
                key={item.id}
                ref={setItemRef(item.id)}
                onClick={() => onSectionClick?.(item.id)}
                data-active={isActive}
                className="relative py-1.5 text-sm text-muted-foreground hover:text-accent-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-primary"
                style={{ paddingInlineStart: isIndent ? 26 : 14 }}
              >
                {/* Vertical line segments */}
                {!isIndent && !showDiagonalUp && i > 0 && (
                  <div
                    className="absolute inset-y-0 w-px bg-foreground/10 bottom-1.5"
                    style={{ insetInlineStart: 0 }}
                  />
                )}
                {isIndent && !showDiagonalDown && (
                  <div
                    className={`absolute inset-y-0 w-px bg-foreground/10 ${isFirstChild ? "top-1.5" : ""} ${isLastChild ? "bottom-1.5" : ""}`}
                    style={{ insetInlineStart: 10 }}
                  />
                )}

                {/* Diagonal connector: parent → child */}
                {showDiagonalDown && (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      className="absolute -top-1.5 start-0 size-4"
                    >
                      <line x1="0" y1="0" x2="10" y2="12" className="stroke-foreground/10" strokeWidth="1" />
                    </svg>
                    <div
                      className="absolute inset-y-0 w-px bg-foreground/10 top-1.5"
                      style={{ insetInlineStart: 10 }}
                    />
                  </>
                )}

                {/* Diagonal connector: child → parent */}
                {showDiagonalUp && (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      className="absolute -top-1.5 start-0 size-4"
                    >
                      <line x1="10" y1="0" x2="0" y2="12" className="stroke-foreground/10" strokeWidth="1" />
                    </svg>
                    <div
                      className="absolute inset-y-0 w-px bg-foreground/10 top-1.5 bottom-1.5"
                      style={{ insetInlineStart: 0 }}
                    />
                  </>
                )}

                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
