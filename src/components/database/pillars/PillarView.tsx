import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Palette,
  Package,
  Users,
  TrendingUp,
  DollarSign,
  Cog,
  Users2,
  Rocket,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { PILLAR_BY_ID } from "./pillarConstants";
import { PillarFieldRenderer } from "./PillarFieldRenderer";

const PILLAR_ICONS: Record<string, any> = {
  brand: Palette,
  product: Package,
  audience: Users,
  market: TrendingUp,
  financial: DollarSign,
  operations: Cog,
  people: Users2,
  growth: Rocket,
  strategy: Target,
};

interface PillarViewProps {
  pillarId: string;
  agentName?: string;
}

export function PillarView({ pillarId, agentName }: PillarViewProps) {
  const pillar = PILLAR_BY_ID[pillarId];
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Initialise active item to the first section whenever the pillar changes
  useEffect(() => {
    if (pillar?.sections.length) {
      setActiveItemId(`section-${pillar.sections[0].id}`);
      // Reset scroll
      if (containerRef.current) containerRef.current.scrollTop = 0;
    }
  }, [pillarId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Observe scroll to highlight the right-rail item closest to the top
  useEffect(() => {
    if (!pillar) return;
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry that is most visible near the top
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target?.id) {
          setActiveItemId(visible.target.id);
        }
      },
      { root, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    pillar.sections.forEach((s) => {
      const sEl = root.querySelector(`#section-${s.id}`);
      if (sEl) observer.observe(sEl);
      s.fields.forEach((fld) => {
        const fEl = root.querySelector(`#${fld.id}`);
        if (fEl) observer.observe(fEl);
      });
    });

    return () => observer.disconnect();
  }, [pillar]);

  const navItems = useMemo(() => {
    if (!pillar) return [] as { id: string; label: string; type: "section" | "field" }[];
    const items: { id: string; label: string; type: "section" | "field" }[] = [];
    pillar.sections.forEach((s) => {
      items.push({ id: `section-${s.id}`, label: s.title, type: "section" });
      s.fields.forEach((f) => {
        items.push({
          id: f.id,
          label: f.name.replace(/^\d+\.\s*/, ""),
          type: "field",
        });
      });
    });
    return items;
  }, [pillar]);

  if (!pillar) return null;

  const Icon = PILLAR_ICONS[pillar.id] || Package;

  const handleNavClick = (id: string) => {
    const el = containerRef.current?.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveItemId(id);
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 flex flex-col xl:flex-row gap-10 items-start">
        {/* Main column */}
        <div className="flex-1 min-w-0 w-full">
          {/* Pillar Header */}
          <div className="flex items-start justify-between mb-10 pb-8 border-b border-border">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-[20px] bg-card border border-border flex items-center justify-center shadow-md shrink-0">
                <Icon size={36} className="text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                  {String(pillar.number).padStart(2, "0")} · {pillar.domain}
                </span>
                <h1 className="text-3xl font-black text-foreground tracking-tight mt-1.5 mb-2">
                  {pillar.name}
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
                <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          </div>

          {/* Document flow */}
          <div className="space-y-14">
            {pillar.sections.map((section) => (
              <section
                id={`section-${section.id}`}
                key={section.id}
                className="scroll-mt-6"
              >
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                  {section.title}
                </h2>
                <div className="space-y-10">
                  {section.fields.map((field) => (
                    <div
                      id={field.id}
                      key={field.id}
                      className="scroll-mt-6 space-y-3"
                    >
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

        {/* Right-rail navigator (sticky) */}
        <aside className="hidden xl:block w-[260px] shrink-0 sticky top-6 self-start">
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="px-2 pb-2 mb-1 border-b border-border/60">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                On this page
              </p>
            </div>
            <nav className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-1">
              {navItems.map((item) => {
                const active = activeItemId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "w-full text-left rounded-md transition-colors text-xs leading-snug",
                      item.type === "section"
                        ? "px-2 py-1.5 mt-2 first:mt-0 font-semibold uppercase tracking-wider text-[10px]"
                        : "pl-5 pr-2 py-1.5 font-medium",
                      active
                        ? "bg-primary/10 text-primary"
                        : item.type === "section"
                          ? "text-foreground hover:bg-muted/50"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
