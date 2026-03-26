import { useState, useCallback, useRef, useEffect } from "react";
import {
  ImageIcon, LayoutGrid, MonitorSmartphone, MousePointerClick, Paintbrush,
  Pencil, Save, X, Upload, Plus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface ImageSlot {
  id: string;
  url: string | null;
  label?: string;
  svgContent?: string;
}

interface GuidelineRule {
  id: string;
  rule: string;
  example?: string;
}

interface VisualIdentityData {
  moodboard: ImageSlot[];
  illustrations: ImageSlot[];
  imageGuidelines: GuidelineRule[];
  websiteRules: string[];
  buttonRules: string[];
  socialMediaRules: string[];
}

interface VisualIdentityInitial {
  imageGuidelines?: { rule: string; example?: string }[];
  websiteRules?: string[];
  buttonRules?: string[];
  socialMediaRules?: string[];
  moodboardUrls?: string[];
  illustrationUrls?: string[];
  illustrationSvgs?: string[];
  websiteScreenshot?: string;
  mobileScreenshot?: string;
  guidelineImageUrls?: string[];
  socialMediaUrls?: string[];
}

interface BrandColorsProps {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
}

const DEFAULT_DATA: VisualIdentityData = {
  moodboard: Array.from({ length: 6 }, (_, i) => ({ id: `mood-${i}`, url: null })),
  illustrations: [
    { id: "illust-0", url: null, label: "Brand icons & symbols set" },
    { id: "illust-1", url: null, label: "Website pattern / texture" },
  ],
  imageGuidelines: [
    { id: "ig-0", rule: "Use natural settings with bright, colorful backgrounds", example: "Product in nature, lifestyle shots with children" },
    { id: "ig-1", rule: "Keep compositions clean and simple for production consistency", example: "Single product centered, minimal props" },
    { id: "ig-2", rule: "Influencer collaborations should feature the product prominently", example: "Unboxing moments, product-in-hand shots" },
  ],
  websiteRules: [
    "Header should reflect brand colors with product-relevant imagery",
    "Optimize images and materials for screen size",
    "Maintain rounded corners (20px) on all buttons and image containers",
  ],
  buttonRules: [
    "Buttons may vary in color but must use rounded corners (20px)",
    "Illustrations and images should also use rounded corners (20px)",
  ],
  socialMediaRules: [
    "Social media should reflect the brand through joyful, warm tones",
    "Use GIFs, colorful text, and dreamy images to build engagement",
    "Applies to posts, stories, and reels",
  ],
};

/* ── Section wrapper ── */
function BrandSection({
  id, icon: Icon, title, description, children,
}: {
  id: string; icon: React.ElementType; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-foreground" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

/* ── Editable image slot ── */
function EditableImageSlot({
  slot, aspect = "aspect-square", isEditing, onUpload, onRemove,
}: {
  slot: ImageSlot; aspect?: string; isEditing: boolean;
  onUpload: (id: string, file: File) => void; onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`${aspect} rounded-lg border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden group`}>
      {slot.url ? (
        <>
          <img src={slot.url} alt={slot.label || "Brand image"} className="absolute inset-0 w-full h-full object-cover" />
          {isEditing && (
            <button
              onClick={() => onRemove(slot.id)}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </>
      ) : (
        <>
          {isEditing ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-1.5 text-muted-foreground/50 hover:text-primary transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">Upload</span>
            </button>
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
              {slot.label && <span className="text-[11px] text-muted-foreground/50 text-center px-3 mt-1">{slot.label}</span>}
            </>
          )}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(slot.id, file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ── Editable rules list ── */
function EditableRulesList({
  rules, isEditing, onChange,
}: {
  rules: string[]; isEditing: boolean; onChange: (rules: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-2 shrink-0" />
          {isEditing ? (
            <div className="flex-1 flex gap-1.5">
              <Input
                value={rule}
                onChange={(e) => {
                  const next = [...rules];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                className="h-8 text-sm flex-1"
              />
              <button
                onClick={() => onChange(rules.filter((_, idx) => idx !== i))}
                className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/80">{rule}</p>
          )}
        </div>
      ))}
      {isEditing && (
        <button
          onClick={() => onChange([...rules, ""])}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
        >
          <Plus className="h-3 w-3" /> Add rule
        </button>
      )}
    </div>
  );
}

/* ── Editable guidelines ── */
function EditableGuidelines({
  guidelines, isEditing, onChange, guidelineImageUrls,
}: {
  guidelines: GuidelineRule[]; isEditing: boolean; onChange: (g: GuidelineRule[]) => void; guidelineImageUrls?: string[];
}) {
  return (
    <div className="space-y-3">
      {guidelines.map((item, i) => (
        <div key={item.id} className="flex gap-3">
          <div className="h-16 w-20 rounded-lg border-2 border-dashed border-border/50 bg-muted/10 flex items-center justify-center shrink-0 overflow-hidden">
            {guidelineImageUrls && guidelineImageUrls[i] ? (
              <img src={guidelineImageUrls[i]} alt="Guideline" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <Input
                    value={item.rule}
                    onChange={(e) => {
                      const next = [...guidelines];
                      next[i] = { ...next[i], rule: e.target.value };
                      onChange(next);
                    }}
                    placeholder="Rule"
                    className="h-7 text-sm flex-1"
                  />
                  <button
                    onClick={() => onChange(guidelines.filter((_, idx) => idx !== i))}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <Input
                  value={item.example || ""}
                  onChange={(e) => {
                    const next = [...guidelines];
                    next[i] = { ...next[i], example: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Example"
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground/80">{item.rule}</p>
                {item.example && <p className="text-xs text-muted-foreground/60 mt-0.5">{item.example}</p>}
              </>
            )}
          </div>
        </div>
      ))}
      {isEditing && (
        <button
          onClick={() => onChange([...guidelines, { id: `ig-${Date.now()}`, rule: "", example: "" }])}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add guideline
        </button>
      )}
    </div>
  );
}

/* ── Main component ── */
export function BrandExtendedSections({
  isEditing: externalEditing,
  onEditToggle,
  onSave,
  initialData,
  brandColors,
}: {
  isEditing?: boolean;
  onEditToggle?: () => void;
  onSave?: (data: VisualIdentityInitial) => void;
  initialData?: VisualIdentityInitial;
  brandColors?: BrandColorsProps;
}) {
  const toArr = <T,>(v: unknown): T[] => Array.isArray(v) ? v : [];
  const [data, setData] = useState<VisualIdentityData>(() => {
    const base = { ...DEFAULT_DATA };
    if (initialData) {
      const rawGuidelines = toArr<any>(initialData.imageGuidelines);
      if (rawGuidelines.length) {
        base.imageGuidelines = rawGuidelines.map((g, i) => ({
          id: `ig-${i}`,
          rule: g?.rule || "",
          example: g?.example,
        }));
      }
      const rawWebsite = toArr<string>(initialData.websiteRules);
      if (rawWebsite.length) base.websiteRules = rawWebsite;
      const rawButton = toArr<string>(initialData.buttonRules);
      if (rawButton.length) base.buttonRules = rawButton;
      const rawSocial = toArr<string>(initialData.socialMediaRules);
      if (rawSocial.length) base.socialMediaRules = rawSocial;
      // Pre-populate moodboard from extracted URLs
      const rawMoodboard = toArr<string>(initialData.moodboardUrls);
      if (rawMoodboard.length) {
        base.moodboard = rawMoodboard.map((url, i) => ({
          id: `mood-${i}`,
          url,
        }));
        // Pad remaining slots to at least 6
        while (base.moodboard.length < 6) {
          base.moodboard.push({ id: `mood-${base.moodboard.length}`, url: null });
        }
      }
      // Pre-populate illustrations from SVGs (preferred) or URLs
      const rawSvgs = toArr<string>(initialData.illustrationSvgs);
      const rawIllustUrls = toArr<string>(initialData.illustrationUrls);
      if (rawSvgs.length) {
        base.illustrations = rawSvgs.map((svg, i) => ({
          id: `illust-${i}`,
          url: null,
          svgContent: svg,
          label: i === 0 ? "Brand icons & symbols set" : "Website pattern / texture",
        }));
        if (base.illustrations.length < 2) {
          base.illustrations.push({ id: `illust-${base.illustrations.length}`, url: null, label: "Add illustration" });
        }
      } else if (rawIllustUrls.length) {
        base.illustrations = rawIllustUrls.map((url, i) => ({
          id: `illust-${i}`,
          url,
          label: `Illustration ${i + 1}`,
        }));
        if (base.illustrations.length < 2) {
          base.illustrations.push({ id: `illust-${base.illustrations.length}`, url: null, label: "Add illustration" });
        }
      }
    }
    return base;
  });
  const isEditing = externalEditing ?? false;

  const handleImageUpload = (slotId: string, file: File, section: "moodboard" | "illustrations") => {
    const url = URL.createObjectURL(file);
    setData((prev) => ({
      ...prev,
      [section]: prev[section].map((s) => (s.id === slotId ? { ...s, url } : s)),
    }));
  };

  const handleImageRemove = (slotId: string, section: "moodboard" | "illustrations") => {
    setData((prev) => ({
      ...prev,
      [section]: prev[section].map((s) => (s.id === slotId ? { ...s, url: null } : s)),
    }));
  };

  const addMoodboardSlot = () => {
    setData((prev) => ({
      ...prev,
      moodboard: [...prev.moodboard, { id: `mood-${Date.now()}`, url: null }],
    }));
  };

  const addIllustrationSlot = () => {
    setData((prev) => ({
      ...prev,
      illustrations: [...prev.illustrations, { id: `illust-${Date.now()}`, url: null, label: "" }],
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <LayoutGrid className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Visual Identity</h2>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={onEditToggle} className="gap-1.5 text-muted-foreground">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={() => {
                onSave?.({
                  imageGuidelines: data.imageGuidelines.map(g => ({ rule: g.rule, example: g.example })),
                  websiteRules: data.websiteRules,
                  buttonRules: data.buttonRules,
                  socialMediaRules: data.socialMediaRules,
                  moodboardUrls: data.moodboard.filter(s => s.url).map(s => s.url!),
                  illustrationUrls: data.illustrations.filter(s => s.url).map(s => s.url!),
                  illustrationSvgs: data.illustrations.filter(s => s.svgContent).map(s => s.svgContent!),
                  websiteScreenshot: initialData?.websiteScreenshot,
                  mobileScreenshot: initialData?.mobileScreenshot,
                  guidelineImageUrls: initialData?.guidelineImageUrls,
                  socialMediaUrls: initialData?.socialMediaUrls,
                });
                onEditToggle?.();
              }} className="gap-1.5">
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onEditToggle} className="gap-1.5">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 py-6 space-y-8 max-w-3xl">
        {/* ── Moodboard ── */}
        <BrandSection
          id="moodboard" icon={LayoutGrid} title="Moodboard"
          description="A curated collection of visual references that capture the brand's look, feel, and aesthetic direction."
        >
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <div className="grid grid-cols-3 gap-3">
              {data.moodboard.map((slot) => (
                <EditableImageSlot
                  key={slot.id} slot={slot} aspect="aspect-[4/3]" isEditing={isEditing}
                  onUpload={(id, file) => handleImageUpload(id, file, "moodboard")}
                  onRemove={(id) => handleImageRemove(id, "moodboard")}
                />
              ))}
            </div>
            {isEditing && (
              <button
                onClick={addMoodboardSlot}
                className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add slot
              </button>
            )}
          </div>
        </BrandSection>

        {/* ── Illustrations ── */}
        <BrandSection
          id="illustrations" icon={Paintbrush} title="Illustrations"
          description="Custom illustrations, mascots, patterns, and decorative assets that reinforce the brand personality."
        >
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {data.illustrations.map((slot) => (
                slot.svgContent ? (
                  <div key={slot.id} className="aspect-square rounded-lg border border-border/50 overflow-hidden bg-card p-2 relative">
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: slot.svgContent }}
                    />
                    {slot.label && (
                      <span className="absolute bottom-1 left-2 text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">{slot.label}</span>
                    )}
                  </div>
                ) : (
                  <EditableImageSlot
                    key={slot.id} slot={slot} aspect="aspect-square" isEditing={isEditing}
                    onUpload={(id, file) => handleImageUpload(id, file, "illustrations")}
                    onRemove={(id) => handleImageRemove(id, "illustrations")}
                  />
                )
              ))}
            </div>
            {isEditing && (
              <button
                onClick={addIllustrationSlot}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add illustration slot
              </button>
            )}
          </div>
        </BrandSection>

        {/* ── Image Guidelines ── */}
        <BrandSection
          id="image-guidelines" icon={ImageIcon} title="Image Guidelines"
          description="Rules for how photography and imagery should be used to maintain brand consistency."
        >
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <EditableGuidelines
              guidelines={data.imageGuidelines}
              isEditing={isEditing}
              onChange={(g) => setData((prev) => ({ ...prev, imageGuidelines: g }))}
              guidelineImageUrls={initialData?.guidelineImageUrls}
            />
          </div>
        </BrandSection>

        {/* ── Website & Digital ── */}
        <BrandSection
          id="website" icon={MonitorSmartphone} title="Website & Digital"
          description="Guidelines for how the brand appears across web and mobile — layout principles, header styles, and responsive behavior."
        >
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {initialData?.websiteScreenshot ? (
                <>
                  <div className="aspect-video rounded-lg border border-border/50 overflow-hidden relative">
                    <img src={initialData.websiteScreenshot} alt="Desktop layout" className="absolute inset-0 w-full h-full object-cover object-top" />
                    <span className="absolute bottom-1 left-2 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">Desktop</span>
                  </div>
                  <div className="aspect-[9/16] max-h-40 rounded-lg border border-border/50 overflow-hidden relative">
                    {initialData?.mobileScreenshot ? (
                      <img src={initialData.mobileScreenshot} alt="Mobile layout" className="absolute inset-0 w-full h-full object-cover object-top" />
                    ) : (
                      <img src={initialData.websiteScreenshot} alt="Mobile layout" className="absolute inset-0 w-full h-full object-cover object-top" />
                    )}
                    <span className="absolute bottom-1 left-2 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">Mobile</span>
                  </div>
                </>
              ) : (
                ["Desktop layout", "Mobile layout"].map((label, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center gap-2 ${
                      i === 0 ? "aspect-video" : "aspect-[9/16] max-h-40"
                    }`}
                  >
                    <MonitorSmartphone className="h-5 w-5 text-muted-foreground/30" />
                    <span className="text-[11px] text-muted-foreground/50">{label}</span>
                  </div>
                ))
              )}
            </div>
            <EditableRulesList
              rules={data.websiteRules}
              isEditing={isEditing}
              onChange={(r) => setData((prev) => ({ ...prev, websiteRules: r }))}
            />
          </div>
        </BrandSection>

        {/* ── Buttons & UI ── */}
        <BrandSection
          id="buttons" icon={MousePointerClick} title="Buttons & UI Elements"
          description="Standard button styles, corner radius, and interactive element guidelines."
        >
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              {brandColors?.primary ? (
                <>
                  <div className="px-6 py-2.5 rounded-[20px] text-sm font-medium" style={{ backgroundColor: brandColors.primary, color: '#FFFFFF' }}>Primary Button</div>
                  <div className="px-6 py-2.5 rounded-[20px] text-sm font-medium" style={{ border: `2px solid ${brandColors.primary}`, color: brandColors.primary }}>Secondary Button</div>
                  <div className="px-6 py-2.5 rounded-[20px] text-sm font-medium" style={{ backgroundColor: `${brandColors.secondary || brandColors.primary}33`, color: brandColors.text || brandColors.primary }}>Muted Button</div>
                </>
              ) : (
                <>
                  <div className="px-6 py-2.5 rounded-[20px] bg-primary text-primary-foreground text-sm font-medium">Primary Button</div>
                  <div className="px-6 py-2.5 rounded-[20px] border border-border bg-card text-foreground text-sm font-medium">Secondary Button</div>
                  <div className="px-6 py-2.5 rounded-[20px] bg-muted text-muted-foreground text-sm font-medium">Muted Button</div>
                </>
              )}
            </div>
            <EditableRulesList
              rules={data.buttonRules}
              isEditing={isEditing}
              onChange={(r) => setData((prev) => ({ ...prev, buttonRules: r }))}
            />
          </div>
        </BrandSection>

        {/* ── Social Media ── */}
        <BrandSection
          id="social-media" icon={LayoutGrid} title="Social Media"
          description="How the brand should appear across social platforms — tone, imagery, and content style."
        >
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {["Feed post", "Story", "Reel"].map((label, i) => {
                const socialUrls = initialData?.socialMediaUrls || [];
                const imgUrl = socialUrls[i];
                return (
                  <div key={i} className={`rounded-lg border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center gap-2 relative overflow-hidden ${
                    i === 1 ? "aspect-[9/16] max-h-32" : "aspect-square"
                  }`}>
                    {imgUrl ? (
                      <>
                        <img src={imgUrl} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-2 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded z-10">{label}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                        <span className="text-[10px] text-muted-foreground/50">{label}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <EditableRulesList
              rules={data.socialMediaRules}
              isEditing={isEditing}
              onChange={(r) => setData((prev) => ({ ...prev, socialMediaRules: r }))}
            />
          </div>
        </BrandSection>
      </div>
    </div>
  );
}
