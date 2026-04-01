import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

const AUDIENCE_TOC_ITEMS: TocItem[] = [
  { id: "audience-overview", title: "Audience overview", level: 1 },
  { id: "audience-description", title: "Audience description", level: 2 },
  { id: "buying-triggers", title: "Buying triggers", level: 2 },
  { id: "use-case-requirements", title: "Use case requirements", level: 2 },
  { id: "key-success-indicators", title: "Key success indicators", level: 2 },
  { id: "additional-characteristics", title: "Additional characteristics", level: 2 },
  { id: "core-messaging", title: "Core messaging", level: 1 },
  { id: "positioning-statement", title: "Positioning statement", level: 2 },
  { id: "value-propositions", title: "Value proposition", level: 2 },
  { id: "engagement-patterns", title: "Engagement patterns", level: 1 },
  { id: "engagement-triggers", title: "Engagement triggers", level: 2 },
  { id: "attention-hooks", title: "Attention hooks", level: 2 },
  { id: "objections-responses", title: "Objections and responses", level: 2 },
  { id: "proof-points-evidence", title: "Proof points and evidence types", level: 2 },
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

export function AudiencePageSidebar({
  activeSection: externalActiveSection,
  onSectionClick,
}: {
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [scrollActiveSection, setScrollActiveSection] = useState<string | null>(null);

  const activeSection = scrollActiveSection || externalActiveSection;
  const [indicatorTop, setIndicatorTop] = useState(TOP_PAD);

  // Scroll-spy
  useEffect(() => {
    const ids = AUDIENCE_TOC_ITEMS.map(s => s.id);
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
    const idx = AUDIENCE_TOC_ITEMS.findIndex((i) => i.id === activeSection);
    if (idx !== -1) setIndicatorTop(TOP_PAD + idx * ITEM_HEIGHT);
  }, [activeSection]);

  const totalHeight = AUDIENCE_TOC_ITEMS.length * ITEM_HEIGHT + TOP_PAD * 2;

  return (
    <nav>
      <h3 className="text-sm font-semibold text-foreground mb-3">On This Page</h3>
      <div className="relative" style={{ height: totalHeight }}>
        <div className="absolute w-px bg-border/60" style={{ left: 3, top: TOP_PAD, bottom: TOP_PAD }} />
        <div
          className="absolute w-[2px] rounded-full bg-primary transition-all duration-200 ease-out"
          style={{ left: 2.5, top: indicatorTop, height: 20 }}
        />
        <div className="relative">
          {AUDIENCE_TOC_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const paddingLeft = item.level === 1 ? 14 : 26;
            return (
              <a
                key={item.id}
                ref={isActive ? activeRef : undefined}
                href={`#${item.id}`}
                onClick={(e) => { e.preventDefault(); setScrollActiveSection(null); onSectionClick?.(item.id); }}
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
