import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { PILLAR_BY_ID } from "./pillarConstants";
import { PillarFieldRenderer } from "./PillarFieldRenderer";
import { buildPillarValues } from "./pillarDataMapper";
import type { BrandEntry, ProductEntry, AudienceEntry } from "@/components/database/BusinessDNAContext";

interface PillarViewProps {
  pillarId: string;
  agentName?: string;
  brand?: BrandEntry;
  products?: ProductEntry[];
  audiences?: AudienceEntry[];
}

// Layout constants for the snake-path navigator (mirrors reference design)
const H_HEADLINE = 40;
const H_CHILD = 36;
const H_BOTTOM_PADDING = 16;
const X_HEADLINE = 1;
const X_CHILD = 13;

export function PillarView({ pillarId, agentName, brand, products = [], audiences = [] }: PillarViewProps) {
  const pillar = PILLAR_BY_ID[pillarId];
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);
  const navLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef(activeItemId);

  // Inject real values into the pillar fields
  const populatedPillar = useMemo(() => {
    if (!pillar) return null;
    const values = buildPillarValues(pillarId, { brand, products, audiences });
    return {
      ...pillar,
      sections: pillar.sections.map((s) => ({
        ...s,
        fields: s.fields.map((f) => (values[f.id] !== undefined ? { ...f, value: values[f.id] } : f)),
      })),
    };
  }, [pillar, pillarId, brand, products, audiences]);

  useEffect(() => {
    activeIdRef.current = activeItemId;
  }, [activeItemId]);

  // Reset state on pillar change
  useEffect(() => {
    if (populatedPillar?.sections.length) {
      setActiveItemId(`section-${populatedPillar.sections[0].id}`);
      if (containerRef.current) containerRef.current.scrollTop = 0;
    }
  }, [pillarId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build snake path geometry for the right-rail navigator
  const treeLayout = useMemo(() => {
    if (!populatedPillar) {
      return { sectionsWithLayout: [] as any[], TotalHeight: 100, fullPathD: "" };
    }
    let currentY = 0;
    const sections = populatedPillar.sections.map((section) => {
      const numChildren = section.fields?.length || 0;
      const sectionHeight = H_HEADLINE + numChildren * H_CHILD + (numChildren > 0 ? H_BOTTOM_PADDING : 0);
      const startY = currentY;
      const endY = currentY + sectionHeight;
      currentY = endY;
      return { ...section, startY, endY, sectionHeight, numChildren };
    });

    const totalH = currentY || 100;
    let d = "";
    let currX = X_HEADLINE;
    d += `M ${currX} 0 `;
    sections.forEach((sec) => {
      if (currX !== X_HEADLINE) {
        d += `L ${currX} ${sec.startY - 8} `;
        d += `C ${currX} ${sec.startY}, ${X_HEADLINE} ${sec.startY}, ${X_HEADLINE} ${sec.startY + 8} `;
        currX = X_HEADLINE;
      }
      if (sec.numChildren > 0) {
        const childrenStartY = sec.startY + H_HEADLINE;
        d += `L ${X_HEADLINE} ${childrenStartY - 8} `;
        d += `C ${X_HEADLINE} ${childrenStartY}, ${X_CHILD} ${childrenStartY}, ${X_CHILD} ${childrenStartY + 8} `;
        currX = X_CHILD;
      }
    });
    d += `L ${currX} ${totalH} `;
    return { sectionsWithLayout: sections, TotalHeight: totalH, fullPathD: d };
  }, [populatedPillar]);

  // Scroll-spy: highlight the section/field nearest the top of the viewport
  useEffect(() => {
    if (!populatedPillar) return;
    const root = containerRef.current;
    if (!root) return;

    const handleScroll = () => {
      if (isNavigatingRef.current) return;
      const containerRect = root.getBoundingClientRect();
      const tripwire = containerRect.top + containerRect.height * 0.35;

      const targets: string[] = [];
      populatedPillar.sections.forEach((s) => {
        targets.push(`section-${s.id}`);
        s.fields.forEach((f) => targets.push(f.id));
      });

      let foundId = targets[0];
      for (const id of targets) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= tripwire + 10) foundId = id;
        else break;
      }
      if (foundId !== activeIdRef.current) setActiveItemId(foundId);
    };

    root.addEventListener("scroll", handleScroll, { passive: true });
    const tid = setTimeout(handleScroll, 200);
    return () => {
      root.removeEventListener("scroll", handleScroll);
      clearTimeout(tid);
    };
  }, [populatedPillar]);

  if (!populatedPillar) return null;

  const scrollToElement = (id: string) => {
    const root = containerRef.current;
    const el = document.getElementById(id);
    if (!root || !el) return;
    if (navLockTimeoutRef.current) clearTimeout(navLockTimeoutRef.current);
    isNavigatingRef.current = true;
    setActiveItemId(id);
    const containerRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const tripwireOffset = containerRect.height * 0.35;
    const targetTop = root.scrollTop + (elRect.top - containerRect.top) - tripwireOffset;
    root.scrollTo({ top: targetTop, behavior: "smooth" });
    navLockTimeoutRef.current = setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  };

  const activeSectionData =
    treeLayout.sectionsWithLayout.find(
      (s) => `section-${s.id}` === activeItemId || s.fields.some((f: any) => f.id === activeItemId)
    ) || treeLayout.sectionsWithLayout[0] || { id: "", startY: 0, sectionHeight: 0 };

  const springTrans = { type: "spring" as const, stiffness: 350, damping: 35 };
  const logoUrl = brand?.logoUrls?.[brand?.selectedLogo ?? 0];

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto bg-[#fcfcfd]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10 flex flex-col xl:flex-row gap-10 items-start">
        {/* Main column */}
        <div className="flex-1 min-w-0 w-full">
          {/* Pillar Header — business logo + name + agent line */}
          <div className="flex items-start justify-between mb-10 pb-8 border-b border-border">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-[20px] bg-card border border-border flex items-center justify-center shadow-md shrink-0 overflow-hidden p-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={brand?.name || "Business logo"}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <BusinessBrainOrb size={40} />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">
                  {populatedPillar.name}
                </h1>
                <div className="flex items-center gap-2">
                  <BusinessBrainOrb size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <span className="text-primary">{agentName || "AI CEO"}</span>
                    <span>//</span>
                    <motion.span
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Learning
                    </motion.span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Document flow */}
          <div className="space-y-14">
            {populatedPillar.sections.map((section) => (
              <section id={`section-${section.id}`} key={section.id} className="scroll-mt-6">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                  {section.title}
                </h2>
                <div className="space-y-10">
                  {section.fields.map((field) => (
                    <div id={field.id} key={field.id} className="scroll-mt-6 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground tracking-tight">
                        {field.name.replace(/^\d+\.\s*/, "")}
                      </h3>
                      <PillarFieldRenderer field={field} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Right-rail snake-path navigator */}
        <aside className="hidden xl:flex w-[280px] shrink-0 sticky top-6 self-start justify-center pb-40 border-l border-border/60">
          <div className="w-[280px] relative px-4">
            <div className="flex flex-col select-none relative w-full ml-3 pb-[40px] pt-[20px]">
              {/* Top tail fade */}
              <svg className="absolute left-0 top-0 pointer-events-none" width="20" height="20">
                <defs>
                  <linearGradient id="pillarTopFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0" />
                    <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path d={`M ${X_HEADLINE} 0 L ${X_HEADLINE} 20`} stroke="url(#pillarTopFade)" strokeWidth="1" />
              </svg>

              {/* Main track */}
              <div className="relative w-full" style={{ height: treeLayout.TotalHeight }}>
                {/* 1. Background grey line */}
                <div className="absolute left-0 top-0 bottom-0 w-[20px] pointer-events-none">
                  <svg width="20" height={treeLayout.TotalHeight} className="absolute left-0 top-0 overflow-visible">
                    <path
                      d={treeLayout.fullPathD}
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>

                {/* 2. Active section highlight overlay */}
                <motion.div
                  className="absolute left-0 pointer-events-none overflow-hidden z-10"
                  initial={false}
                  animate={{
                    top: activeSectionData.startY - 12,
                    height: activeSectionData.sectionHeight + 24,
                  }}
                  transition={springTrans}
                  style={{ width: "20px" }}
                >
                  <motion.svg
                    width="20"
                    height={treeLayout.TotalHeight}
                    className="absolute left-0 top-0 overflow-visible"
                    initial={false}
                    animate={{ top: -(activeSectionData.startY - 12) }}
                    transition={springTrans}
                  >
                    <path
                      d={treeLayout.fullPathD}
                      stroke="hsl(var(--primary))"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </motion.svg>
                </motion.div>

                {/* 3. Text content layer */}
                <div className="absolute left-0 top-0 w-full z-20 flex flex-col">
                  {treeLayout.sectionsWithLayout.map((section: any) => (
                    <div
                      key={section.id}
                      className="relative w-full flex flex-col"
                      style={{ height: section.sectionHeight }}
                    >
                      {/* Section headline */}
                      <div
                        className="flex items-center cursor-pointer group"
                        style={{ height: H_HEADLINE, paddingLeft: "24px" }}
                        onClick={() => scrollToElement(`section-${section.id}`)}
                      >
                        <span
                          className={`text-[15px] font-medium transition-colors duration-200 tracking-tight ${
                            activeItemId === `section-${section.id}` ||
                            section.fields.some((f: any) => f.id === activeItemId)
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {section.title}
                        </span>
                      </div>

                      {/* Sub-items */}
                      {section.fields && (
                        <div className="flex flex-col">
                          {section.fields.map((field: any) => {
                            const isSectionActive = activeSectionData.id === section.id;
                            return (
                              <div
                                key={field.id}
                                className="flex items-center cursor-pointer group"
                                style={{ height: H_CHILD, paddingLeft: "36px" }}
                                onClick={() => scrollToElement(field.id)}
                              >
                                <span
                                  className={`text-[14px] transition-colors duration-200 tracking-tight truncate ${
                                    isSectionActive
                                      ? "text-primary"
                                      : "text-muted-foreground group-hover:text-foreground"
                                  }`}
                                >
                                  {field.name.replace(/^\d+\.\s*/, "")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom tail fade */}
              <div className="relative w-full h-[24px]">
                <svg className="absolute left-0 top-0 pointer-events-none" width="20" height="24">
                  <defs>
                    <linearGradient id="pillarBottomFade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="1" />
                      <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`M ${X_HEADLINE} 0 L ${X_HEADLINE} 24`} stroke="url(#pillarBottomFade)" strokeWidth="1" />
                </svg>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
