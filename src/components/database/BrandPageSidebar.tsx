import { useCallback, useEffect, useRef, useState } from "react";

interface FlatItem {
  id: string;
  label: string;
  indent: boolean;
}

interface SidebarSection {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

const BRAND_SECTIONS: SidebarSection[] = [
  {
    id: "branding",
    label: "Branding",
    children: [
      { id: "logo", label: "Primary logo" },
      { id: "colors", label: "Brand colors" },
      { id: "typography", label: "Typography" },
    ],
  },
  {
    id: "extended-brand",
    label: "Visual Identity",
    children: [
      { id: "moodboard", label: "Moodboard" },
      { id: "illustrations", label: "Illustrations" },
      { id: "image-guidelines", label: "Image Guidelines" },
      { id: "website", label: "Website & Digital" },
      { id: "buttons", label: "Buttons & UI" },
      { id: "social-media", label: "Social Media" },
    ],
  },
  {
    id: "value-exchange",
    label: "Value Exchange Loop",
    children: [
      { id: "problem", label: "The Problem" },
      { id: "solution", label: "The Solution" },
      { id: "customer", label: "The Customer" },
      { id: "economics", label: "The Economics" },
      { id: "formula", label: "Atomic Formula" },
    ],
  },
];

// Flatten sections into a linear list for SVG path generation
function flattenSections(sections: SidebarSection[]): FlatItem[] {
  const flat: FlatItem[] = [];
  for (const section of sections) {
    flat.push({ id: section.id, label: section.label, indent: false });
    if (section.children) {
      for (const child of section.children) {
        flat.push({ id: child.id, label: child.label, indent: true });
      }
    }
  }
  return flat;
}

const ITEM_HEIGHT = 32;

function buildSvgPath(items: FlatItem[]): string {
  const parts: string[] = [];
  let prevIndent = false;

  for (let i = 0; i < items.length; i++) {
    const isIndent = items[i].indent;
    const y = i * ITEM_HEIGHT + ITEM_HEIGHT / 2;
    const nextItem = items[i + 1];

    if (i === 0) {
      parts.push(`M${isIndent ? 11 : 1} ${y}`);
    } else {
      const prevY = (i - 1) * ITEM_HEIGHT + ITEM_HEIGHT / 2;
      if (!prevIndent && isIndent) {
        parts.push(`L1 ${prevY}`);
        parts.push(`L11 ${y}`);
      } else if (prevIndent && !isIndent) {
        parts.push(`L11 ${prevY}`);
        parts.push(`L1 ${y}`);
      } else {
        const x = isIndent ? 11 : 1;
        parts.push(`L${x} ${y}`);
      }
    }

    if (!nextItem) {
      const x = isIndent ? 11 : 1;
      parts.push(`L${x} ${y}`);
    }

    prevIndent = isIndent;
  }

  return parts.join(" ");
}

export function BrandPageSidebar({
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

  const flatItems = flattenSections(BRAND_SECTIONS);

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

  const svgPath = buildSvgPath(flatItems);
  const totalHeight = flatItems.length * ITEM_HEIGHT;

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
            <div className="absolute inset-0 bg-foreground/10" />
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
          {flatItems.map((item, i) => {
            const isActive = activeSection === item.id;
            const prevItem = flatItems[i - 1];
            const nextItem = flatItems[i + 1];
            const prevIndent = prevItem ? prevItem.indent : false;
            const nextIndent = nextItem ? nextItem.indent : false;
            const isIndent = item.indent;

            const showDiagonalDown = !prevIndent && isIndent && i > 0;
            const showDiagonalUp = prevIndent && !isIndent && i > 0;
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
