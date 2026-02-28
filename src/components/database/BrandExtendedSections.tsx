import {
  ImageIcon, LayoutGrid, MonitorSmartphone, MousePointerClick, Paintbrush,
  Pencil, Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/* ── Section wrapper ── */
function BrandSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

/* ── Placeholder image grid ── */
function ImageGrid({ count, aspect = "aspect-square" }: { count: number; aspect?: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${aspect} rounded-lg border-2 border-dashed border-border/50 bg-muted/20 flex items-center justify-center`}
        >
          <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
        </div>
      ))}
    </div>
  );
}

/* ── Example color dot row ── */
function ExampleColorDots() {
  const exampleColors = [
    "hsl(330, 80%, 65%)", // pink
    "hsl(200, 80%, 70%)", // blue
    "hsl(55, 90%, 65%)",  // yellow
    "hsl(270, 60%, 65%)", // purple
    "hsl(170, 60%, 70%)", // mint
  ];
  return (
    <div className="flex items-center gap-3">
      {exampleColors.map((c, i) => (
        <div
          key={i}
          className="h-10 w-10 rounded-full border border-border/40 shrink-0"
          style={{ backgroundColor: c }}
        />
      ))}
      <span className="text-xs text-muted-foreground/50 ml-2 italic">Example accent & background colors</span>
    </div>
  );
}

/* ── Main component ── */
export function BrandExtendedSections() {
  return (
    <div className="px-6 py-6 space-y-8 max-w-3xl">
      {/* ── Moodboard ── */}
      <BrandSection
        id="moodboard"
        icon={LayoutGrid}
        title="Moodboard"
        description="A curated collection of visual references that capture the brand's look, feel, and aesthetic direction."
      >
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
          <ImageGrid count={6} aspect="aspect-[4/3]" />
          <div className="space-y-1">
            <ExampleColorDots />
            <p className="text-xs text-muted-foreground/50 italic mt-2">
              Upload images that represent the brand's desired mood — product shots, lifestyle photos, color palettes, textures.
            </p>
          </div>
        </div>
      </BrandSection>

      {/* ── Illustrations ── */}
      <BrandSection
        id="illustrations"
        icon={Paintbrush}
        title="Illustrations"
        description="Custom illustrations, mascots, patterns, and decorative assets that reinforce the brand personality."
      >
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {["Primary mascot / character", "Pattern or decorative element"].map((label, i) => (
              <div key={i} className="aspect-square rounded-lg border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center gap-2">
                <Paintbrush className="h-5 w-5 text-muted-foreground/30" />
                <span className="text-[11px] text-muted-foreground/50 text-center px-3">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/50 italic">
            Upload brand illustrations, mascots, icons, and repeatable patterns.
          </p>
        </div>
      </BrandSection>

      {/* ── Image Guidelines ── */}
      <BrandSection
        id="image-guidelines"
        icon={ImageIcon}
        title="Image Guidelines"
        description="Rules for how photography and imagery should be used to maintain brand consistency."
      >
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
          <div className="space-y-3">
            {[
              {
                rule: "Use natural settings with bright, colorful backgrounds",
                example: "Product in nature, lifestyle shots with children",
              },
              {
                rule: "Keep compositions clean and simple for production consistency",
                example: "Single product centered, minimal props",
              },
              {
                rule: "Influencer collaborations should feature the product prominently",
                example: "Unboxing moments, product-in-hand shots",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-16 w-20 rounded-lg border-2 border-dashed border-border/50 bg-muted/10 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground/80">{item.rule}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{item.example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrandSection>

      {/* ── Website & Digital ── */}
      <BrandSection
        id="website"
        icon={MonitorSmartphone}
        title="Website & Digital"
        description="Guidelines for how the brand appears across web and mobile — layout principles, header styles, and responsive behavior."
      >
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {["Desktop layout", "Mobile layout"].map((label, i) => (
              <div
                key={i}
                className={`rounded-lg border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center gap-2 ${
                  i === 0 ? "aspect-video" : "aspect-[9/16] max-h-40"
                }`}
              >
                <MonitorSmartphone className="h-5 w-5 text-muted-foreground/30" />
                <span className="text-[11px] text-muted-foreground/50">{label}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              "Header should reflect brand colors with product-relevant imagery",
              "Optimize images and materials for screen size",
              "Maintain rounded corners (20px) on all buttons and image containers",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                <p className="text-sm text-muted-foreground/80">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </BrandSection>

      {/* ── Buttons & UI ── */}
      <BrandSection
        id="buttons"
        icon={MousePointerClick}
        title="Buttons & UI Elements"
        description="Standard button styles, corner radius, and interactive element guidelines."
      >
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="px-6 py-2.5 rounded-[20px] bg-primary text-primary-foreground text-sm font-medium">
              Primary Button
            </div>
            <div className="px-6 py-2.5 rounded-[20px] border border-border bg-card text-foreground text-sm font-medium">
              Secondary Button
            </div>
            <div className="px-6 py-2.5 rounded-[20px] bg-muted text-muted-foreground text-sm font-medium">
              Muted Button
            </div>
          </div>
          <div className="space-y-2">
            {[
              "Buttons may vary in color but must use rounded corners (20px)",
              "Illustrations and images should also use rounded corners (20px)",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                <p className="text-sm text-muted-foreground/80">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </BrandSection>

      {/* ── Social Media ── */}
      <BrandSection
        id="social-media"
        icon={LayoutGrid}
        title="Social Media"
        description="How the brand should appear across social platforms — tone, imagery, and content style."
      >
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {["Feed post", "Story", "Reel"].map((label, i) => (
              <div key={i} className={`rounded-lg border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center gap-2 ${
                i === 1 ? "aspect-[9/16] max-h-32" : "aspect-square"
              }`}>
                <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                <span className="text-[10px] text-muted-foreground/50">{label}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              "Social media should reflect the brand through joyful, warm tones",
              "Use GIFs, colorful text, and dreamy images to build engagement",
              "Applies to posts, stories, and reels",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                <p className="text-sm text-muted-foreground/80">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </BrandSection>
    </div>
  );
}
