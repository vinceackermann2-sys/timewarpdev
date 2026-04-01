import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

const BRAND_TOC_ITEMS: TocItem[] = [
  { id: "branding", title: "Branding", level: 1 },
  { id: "logo", title: "Primary logo", level: 2 },
  { id: "colors", title: "Brand colors", level: 2 },
  { id: "typography", title: "Typography", level: 2 },
  { id: "extended-brand", title: "Visual Identity", level: 1 },
  { id: "moodboard", title: "Moodboard", level: 2 },
  { id: "illustrations", title: "Illustrations", level: 2 },
  { id: "image-guidelines", title: "Image Guidelines", level: 2 },
  { id: "website", title: "Website & Digital", level: 2 },
  { id: "buttons", title: "Buttons & UI", level: 2 },
  { id: "social-media", title: "Social Media", level: 2 },
];

const ITEM_HEIGHT = 32;
const TOP_PAD = 12;

export function BrandPageSidebar({
  brandName,
  activeSection: externalActiveSection,
  onSectionClick,
}: {
  brandName?: string;
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [scrollActiveSection, setScrollActiveSection] = useState<string | null>(null);

  const activeSection = scrollActiveSection || externalActiveSection;
  const [indicatorTop, setIndicatorTop] = useState(TOP_PAD);

  // Scroll-spy
  useEffect(() => {
    const ids = BRAND_TOC_ITEMS.map(s => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setScrollActiveSection(visible.target.id);
      },
      { root: null, rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const idx = BRAND_TOC_ITEMS.findIndex((i) => i.id === activeSection);
    if (idx !== -1) setIndicatorTop(TOP_PAD + idx * ITEM_HEIGHT);
  }, [activeSection]);

  const totalHeight = BRAND_TOC_ITEMS.length * ITEM_HEIGHT + TOP_PAD * 2;

  return (
    <nav>
      {brandName && (
        <p className="text-[11px] text-muted-foreground/70 mb-2 truncate">Business DNA › {brandName} › Brand</p>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-3">On This Page</h3>
      <div className="relative" style={{ height: totalHeight }}>
        <div className="absolute w-px bg-border/60" style={{ left: 3, top: TOP_PAD, bottom: TOP_PAD }} />
        <div
          className="absolute w-[2px] rounded-full bg-primary transition-all duration-200 ease-out"
          style={{ left: 2.5, top: indicatorTop, height: 20 }}
        />
        <div className="relative">
          {BRAND_TOC_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const paddingLeft = item.level === 1 ? 14 : 26;
            return (
              <a
                key={item.id}
                ref={isActive ? activeRef : undefined}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setScrollActiveSection(null);
                  onSectionClick?.(item.id);
                }}
                className={cn(
                  "relative block py-1.5 text-sm transition-colors hover:text-accent-foreground",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
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
