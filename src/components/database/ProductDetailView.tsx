import { useState, useRef } from "react";
import {
  Package, Pencil, Save, X, ArrowLeft, Upload, Trash2, Plus, Lock,
  Sparkles, Check, CircleAlert, ChevronDown, ChevronUp, ImageIcon,
  Crosshair, Zap, ShieldCheck, MessageSquareWarning, Languages, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProductPageSidebar } from "@/components/database/ProductPageSidebar";
import { cn } from "@/lib/utils";

/* ── Types ── */
export interface ProductData {
  id: string;
  name: string;
  category: string;
  images: { id: string; url: string | null; label: string }[];
  description: string;
  features: string[];
  benefits: string[];
  painPoints: string[];
  useCases: string[];
  targetScenarios: string[];
  positioningStatement: string;
  uniqueSellingPoints: string[];
  competitiveAdvantages: string[];
  commonObjections: { objection: string; response: string }[];
  proofPoints: string[];
  dosAndDonts: { dos: string[]; donts: string[] };
  powerPhrases: string[];
  powerWords: string[];
  technicalLevel: string;
  refinementChecklist: string[];
  lastUpdated: string;
}

export const DEFAULT_PRODUCT: ProductData = {
  id: "",
  name: "My Product",
  category: "SaaS",
  images: [
    { id: "img-1", url: null, label: "Product Image 1" },
    { id: "img-2", url: null, label: "Product Image 2" },
    { id: "img-3", url: null, label: "Product Image 3" },
    { id: "img-4", url: null, label: "Product Image 4" },
  ],
  description: "Cover gray hair and regrowth in just 10 minutes at home! Delivers salon-quality color lasting 4–6 weeks — no ammonia, no parabens, no harsh chemicals. Gentle on all hair types including sensitive scalps. Simply lather, apply to dry hair, wait 10 minutes, and rinse. Backed by a 365-day money-back guarantee.",
  features: [
    "2-in-1 instant hair dyeing and cleansing formula in a single application",
    "Instant color deposit technology that works during the wash cycle",
    "Shampoo-based delivery system requiring no separate mixing, developer, or tools",
    "Color-refreshing formula that revives and maintains existing dyed hair between salon visits",
    "Gentle cleansing agents designed to preserve color vibrancy while washing hair",
  ],
  benefits: [
    "Save significant time by coloring and washing hair simultaneously in one step",
    "Eliminate the mess and complexity of traditional at-home hair dye kits",
    "Maintain fresh, vibrant hair color without scheduling frequent salon appointments",
    "Reduce long-term hair coloring costs by extending time between full dye treatments",
    "Achieve consistent, even color results without professional expertise or tools",
    "Minimize chemical exposure compared to traditional oxidative dye processes",
  ],
  painPoints: [
    "Traditional hair dye kits are messy, time-consuming, and require complex multi-step processes",
    "Frequent salon visits for color maintenance are expensive and inconvenient",
    "Dyed hair fades quickly between treatments, leaving hair looking dull and washed-out",
    "At-home dye application often results in uneven color, staining, and damage",
    "Busy lifestyles leave little time for lengthy hair coloring routines",
  ],
  useCases: [
    "Refreshing and maintaining existing hair color between salon appointments",
    "Covering grey regrowth and roots as part of a regular weekly wash routine",
    "Gradually building up hair color intensity over multiple washes",
    "Replacing a standard shampoo step with a color-depositing alternative for dyed hair upkeep",
    "Traveling or on-the-go color maintenance without carrying a full dye kit",
  ],
  targetScenarios: [
    "When dyed hair starts visibly fading 2–3 weeks after a salon visit and a touch-up is needed",
    "When a busy schedule makes it impossible to block out time for a traditional dye session",
    "When the cost of frequent salon color appointments becomes unsustainable",
    "When users want to experiment with or maintain hair color without committing to a full dye process",
    "When traveling and maintaining hair color routine without packing bulky dye kits",
    "When grey roots begin showing between full color treatments and a quick fix is needed",
  ],
  positioningStatement: "The effortless at-home color solution that replaces salon touch-ups — salon-quality results in 10 minutes, with zero mess.",
  uniqueSellingPoints: [
    "10-minute application time vs. 45+ minutes for traditional dye",
    "No mixing, developer, or tools required",
    "365-day money-back guarantee",
    "Gentle, ammonia-free formula for sensitive scalps",
  ],
  competitiveAdvantages: [
    "All-in-one shampoo + color vs. multi-step kits from competitors",
    "Significantly cheaper per-use cost than salon visits",
    "Simplified process requires zero hair coloring experience",
  ],
  commonObjections: [
    { objection: "Will it actually cover gray hair?", response: "Yes — our instant color deposit technology covers grays in one 10-minute wash. Results improve with repeated use." },
    { objection: "Is it safe for sensitive scalps?", response: "Absolutely. Ammonia-free, paraben-free formula tested on sensitive skin. Backed by our 365-day guarantee." },
    { objection: "Will it stain my shower/towels?", response: "When used as directed, staining is minimal. Rinse thoroughly and use a dark towel as a precaution." },
  ],
  proofPoints: [
    "365-day money-back guarantee demonstrates confidence in the product",
    "Before/after customer photos showing gray coverage results",
    "Dermatologically tested for sensitive scalps",
    "Customer testimonials from repeat buyers",
  ],
  dosAndDonts: {
    dos: [
      "Emphasize the simplicity and speed (10 minutes)",
      "Highlight the money-back guarantee prominently",
      "Use before/after imagery when possible",
      "Focus on convenience and time savings",
    ],
    donts: [
      "Don't compare directly to salon-quality permanent dye",
      "Don't overstate coverage for very resistant grays",
      "Don't use clinical or intimidating language",
      "Don't forget to mention it's ammonia-free and gentle",
    ],
  },
  powerPhrases: [
    "Salon-quality color in just 10 minutes",
    "Say goodbye to regrowth for good",
    "Zero mess, zero stress",
    "The easiest color routine you'll ever have",
  ],
  powerWords: [
    "Effortless", "Instant", "Gentle", "Vibrant", "Salon-quality", "Guaranteed",
  ],
  technicalLevel: "Consumer-friendly — avoid technical jargon. Speak in benefits, not chemistry. Target reading level: 6th grade.",
  refinementChecklist: [
    "Does the copy lead with the biggest benefit?",
    "Is the 10-minute claim prominent?",
    "Is the guarantee mentioned within the first 3 sentences?",
    "Are pain points addressed before introducing the solution?",
    "Does the tone feel warm and approachable, not clinical?",
  ],
  lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
};

/* ── Section heading ── */
function SectionHeading({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} className="pt-2">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

/* ── Bullet list with icons ── */
function BulletList({
  items, icon, iconClass, isEditing, onChange,
}: {
  items: string[];
  icon: React.ElementType;
  iconClass: string;
  isEditing: boolean;
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-2.5 mt-3">
      {items.map((item, i) => {
        const Icon = icon;
        return (
          <div key={i} className="flex items-start gap-2.5">
            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconClass)} />
            {isEditing ? (
              <div className="flex-1 flex gap-1.5">
                <Input
                  value={item}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = e.target.value;
                    onChange(next);
                  }}
                  className="h-8 text-sm flex-1"
                />
                <button
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-foreground/80 leading-relaxed">{item}</span>
            )}
          </div>
        );
      })}
      {isEditing && (
        <button
          onClick={() => onChange([...items, ""])}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors ml-6"
        >
          <Plus className="h-3 w-3" /> Add item
        </button>
      )}
    </div>
  );
}

/* ── Image slot ── */
function ProductImageSlot({
  slot, isEditing, onUpload, onRemove,
}: {
  slot: { id: string; url: string | null; label: string };
  isEditing: boolean;
  onUpload: (id: string, file: File) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="aspect-square rounded-xl border border-border/50 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden group">
      {slot.url ? (
        <>
          <img src={slot.url} alt={slot.label} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <span className="text-xs font-medium text-white">{slot.label}</span>
          </div>
          {isEditing && (
            <button
              onClick={() => onRemove(slot.id)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
              className="flex flex-col items-center gap-2 text-muted-foreground/50 hover:text-primary transition-colors"
            >
              <Upload className="h-6 w-6" />
              <span className="text-xs">Upload</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
              <span className="text-[11px] text-muted-foreground/50">{slot.label}</span>
            </div>
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

/* ── Main ── */
export function ProductDetailView({
  product,
  onBack,
  onSave,
}: {
  product: ProductData;
  onBack: () => void;
  onSave: (product: ProductData) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<ProductData>(product);
  const [descExpanded, setDescExpanded] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState("product-overview");

  const handleSave = () => {
    onSave(data);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setData(product);
    setIsEditing(false);
  };

  const handleImageUpload = (id: string, file: File) => {
    const url = URL.createObjectURL(file);
    setData(prev => ({ ...prev, images: prev.images.map(img => img.id === id ? { ...img, url } : img) }));
  };

  const handleImageRemove = (id: string) => {
    setData(prev => ({ ...prev, images: prev.images.map(img => img.id === id ? { ...img, url: null } : img) }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
              {isEditing ? (
                <Input
                  value={data.name}
                  onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-bold h-auto py-1 px-2 border-border/60"
                />
              ) : (
                <h1 className="text-xl font-bold text-foreground truncate">{data.name}</h1>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 ml-10">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                Visibility: <Lock className="h-3 w-3" /> Private
              </span>
              <span className="text-xs text-muted-foreground/60">|</span>
              <span className="text-xs text-muted-foreground">Last updated: {data.lastUpdated}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5 text-muted-foreground">
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} className="gap-1.5">
                  <Save className="h-4 w-4" /> Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-8">

              {/* ── Product overview (images) ── */}
              <div id="product-overview" className="rounded-xl border border-border/50 bg-card shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-foreground">Product overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.images.map((img) => (
                    <ProductImageSlot
                      key={img.id}
                      slot={img}
                      isEditing={isEditing}
                      onUpload={handleImageUpload}
                      onRemove={handleImageRemove}
                    />
                  ))}
                </div>
                {isEditing && (
                  <button
                    onClick={() => setData(prev => ({
                      ...prev,
                      images: [...prev.images, { id: `img-${Date.now()}`, url: null, label: `Product Image ${prev.images.length + 1}` }],
                    }))}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add image slot
                  </button>
                )}
                <p className="text-xs text-muted-foreground text-center">{data.images.length} product images</p>
              </div>

              {/* ── Product description ── */}
              <div id="product-description" className="space-y-2">
                <SectionHeading id="" title="Product description" subtitle="Summary of what your product is, its core purpose, and who it's designed for." />
                {isEditing ? (
                  <Textarea
                    value={data.description}
                    onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                    className="text-sm min-h-[100px] resize-none mt-3"
                  />
                ) : (
                  <div className="mt-3">
                    <p className={cn(
                      "text-sm text-foreground/80 leading-relaxed",
                      !descExpanded && "line-clamp-3"
                    )}>
                      {data.description}
                    </p>
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="flex items-center gap-1.5 text-sm font-medium text-foreground mt-3 mx-auto hover:text-primary transition-colors"
                    >
                      {descExpanded ? "Less detail" : "More detail"}
                      {descExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="border-b border-border/30" />

              {/* ── Key features ── */}
              <div>
                <SectionHeading id="key-features" title="Key features" subtitle="Core functional capabilities that define your product." />
                <BulletList items={data.features} icon={Sparkles} iconClass="text-amber-500" isEditing={isEditing} onChange={(f) => setData(prev => ({ ...prev, features: f }))} />
              </div>

              {/* ── Key benefits ── */}
              <div>
                <SectionHeading id="key-benefits" title="Key benefits" subtitle="Value that users gain from your product's features." />
                <BulletList items={data.benefits} icon={Check} iconClass="text-emerald-500" isEditing={isEditing} onChange={(b) => setData(prev => ({ ...prev, benefits: b }))} />
              </div>

              {/* ── Target pain points ── */}
              <div>
                <SectionHeading id="target-pain-points" title="Target pain points" subtitle="Specific problems your product solves for users." />
                <BulletList items={data.painPoints} icon={CircleAlert} iconClass="text-rose-400" isEditing={isEditing} onChange={(p) => setData(prev => ({ ...prev, painPoints: p }))} />
              </div>

              {/* ── Primary use cases ── */}
              <div>
                <SectionHeading id="primary-use-cases" title="Primary use cases" subtitle="Main scenarios where users apply your product." />
                <BulletList items={data.useCases} icon={Check} iconClass="text-emerald-500" isEditing={isEditing} onChange={(u) => setData(prev => ({ ...prev, useCases: u }))} />
              </div>

              {/* ── Target scenarios ── */}
              <div>
                <SectionHeading id="target-scenarios" title="Target scenarios" subtitle="Specific situations or triggers that lead users to need your product." />
                <BulletList items={data.targetScenarios} icon={Crosshair} iconClass="text-sky-400" isEditing={isEditing} onChange={(s) => setData(prev => ({ ...prev, targetScenarios: s }))} />
              </div>

              <div className="border-b border-border/30" />

              {/* ── Value proposition ── */}
              <div id="value-proposition">
                <h3 className="text-base font-bold text-foreground">Value proposition</h3>
              </div>

              {/* Positioning statement */}
              <div>
                <SectionHeading id="positioning-statement" title="Positioning statement" subtitle="One clear sentence that defines your market position." />
                <div className="mt-3 rounded-lg border border-border/40 bg-muted/20 p-4">
                  {isEditing ? (
                    <Textarea
                      value={data.positioningStatement}
                      onChange={(e) => setData(prev => ({ ...prev, positioningStatement: e.target.value }))}
                      className="text-sm min-h-[60px] resize-none"
                    />
                  ) : (
                    <p className="text-sm text-foreground/80 leading-relaxed italic">"{data.positioningStatement}"</p>
                  )}
                </div>
              </div>

              {/* Unique selling points */}
              <div>
                <SectionHeading id="unique-selling-points" title="Unique selling points" subtitle="What makes your product stand out from alternatives." />
                <BulletList items={data.uniqueSellingPoints} icon={Zap} iconClass="text-amber-500" isEditing={isEditing} onChange={(u) => setData(prev => ({ ...prev, uniqueSellingPoints: u }))} />
              </div>

              {/* Competitive advantages */}
              <div>
                <SectionHeading id="competitive-advantages" title="Competitive advantages" subtitle="Structural advantages over competitors." />
                <BulletList items={data.competitiveAdvantages} icon={ShieldCheck} iconClass="text-emerald-500" isEditing={isEditing} onChange={(c) => setData(prev => ({ ...prev, competitiveAdvantages: c }))} />
              </div>

              <div className="border-b border-border/30" />

              {/* ── Objections & proof points ── */}
              <div id="objections-proof">
                <h3 className="text-base font-bold text-foreground">Objections & proof points</h3>
              </div>

              {/* Common objections */}
              <div id="common-objections" className="space-y-3">
                <SectionHeading id="" title="Common objections and responses" subtitle="Anticipated concerns and how to address them." />
                <div className="space-y-3 mt-3">
                  {data.commonObjections.map((obj, i) => (
                    <div key={i} className="rounded-lg border border-border/40 bg-muted/10 p-4 space-y-2">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            <Input
                              value={obj.objection}
                              onChange={(e) => {
                                const next = [...data.commonObjections];
                                next[i] = { ...next[i], objection: e.target.value };
                                setData(prev => ({ ...prev, commonObjections: next }));
                              }}
                              placeholder="Objection"
                              className="h-8 text-sm flex-1"
                            />
                            <button
                              onClick={() => setData(prev => ({ ...prev, commonObjections: prev.commonObjections.filter((_, idx) => idx !== i) }))}
                              className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <Input
                            value={obj.response}
                            onChange={(e) => {
                              const next = [...data.commonObjections];
                              next[i] = { ...next[i], response: e.target.value };
                              setData(prev => ({ ...prev, commonObjections: next }));
                            }}
                            placeholder="Response"
                            className="h-8 text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-2">
                            <MessageSquareWarning className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm font-medium text-foreground/90">"{obj.objection}"</p>
                          </div>
                          <p className="text-sm text-muted-foreground/80 ml-6">{obj.response}</p>
                        </>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button
                      onClick={() => setData(prev => ({ ...prev, commonObjections: [...prev.commonObjections, { objection: "", response: "" }] }))}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add objection
                    </button>
                  )}
                </div>
              </div>

              {/* Proof points */}
              <div>
                <SectionHeading id="proof-points" title="Proof points and evidence types" subtitle="Evidence that supports your product claims." />
                <BulletList items={data.proofPoints} icon={ShieldCheck} iconClass="text-sky-400" isEditing={isEditing} onChange={(p) => setData(prev => ({ ...prev, proofPoints: p }))} />
              </div>

              <div className="border-b border-border/30" />

              {/* ── Language patterns ── */}
              <div id="language-patterns">
                <h3 className="text-base font-bold text-foreground">Language patterns</h3>
              </div>

              {/* Do's and Don'ts */}
              <div id="dos-and-donts" className="space-y-4">
                <SectionHeading id="" title="Do's and Don'ts" subtitle="Communication guidelines for product messaging." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><Check className="h-4 w-4" /> Do's</h4>
                    {data.dosAndDonts.dos.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        {isEditing ? (
                          <div className="flex-1 flex gap-1">
                            <Input value={item} onChange={(e) => {
                              const next = [...data.dosAndDonts.dos];
                              next[i] = e.target.value;
                              setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: next } }));
                            }} className="h-7 text-xs flex-1" />
                            <button onClick={() => {
                              setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: prev.dosAndDonts.dos.filter((_, idx) => idx !== i) } }));
                            }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <span className="text-xs text-foreground/80">{item}</span>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: [...prev.dosAndDonts.dos, ""] } }))}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1"><Plus className="h-3 w-3" /> Add</button>
                    )}
                  </div>
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-rose-600 flex items-center gap-1.5"><X className="h-4 w-4" /> Don'ts</h4>
                    {data.dosAndDonts.donts.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <X className="h-3.5 w-3.5 text-rose-500 mt-0.5 shrink-0" />
                        {isEditing ? (
                          <div className="flex-1 flex gap-1">
                            <Input value={item} onChange={(e) => {
                              const next = [...data.dosAndDonts.donts];
                              next[i] = e.target.value;
                              setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: next } }));
                            }} className="h-7 text-xs flex-1" />
                            <button onClick={() => {
                              setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: prev.dosAndDonts.donts.filter((_, idx) => idx !== i) } }));
                            }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <span className="text-xs text-foreground/80">{item}</span>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: [...prev.dosAndDonts.donts, ""] } }))}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1"><Plus className="h-3 w-3" /> Add</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Power phrases */}
              <div>
                <SectionHeading id="power-phrases" title="Power phrases" subtitle="High-impact phrases to use in marketing copy." />
                <div className="flex flex-wrap gap-2 mt-3">
                  {data.powerPhrases.map((phrase, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Input value={phrase} onChange={(e) => {
                            const next = [...data.powerPhrases];
                            next[i] = e.target.value;
                            setData(prev => ({ ...prev, powerPhrases: next }));
                          }} className="h-7 text-xs w-52" />
                          <button onClick={() => setData(prev => ({ ...prev, powerPhrases: prev.powerPhrases.filter((_, idx) => idx !== i) }))}
                            className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <span className="text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">"{phrase}"</span>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button onClick={() => setData(prev => ({ ...prev, powerPhrases: [...prev.powerPhrases, ""] }))}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"><Plus className="h-3 w-3" /> Add</button>
                  )}
                </div>
              </div>

              {/* Power words */}
              <div>
                <SectionHeading id="power-words" title="Power words" subtitle="Single words that resonate with your audience." />
                <div className="flex flex-wrap gap-2 mt-3">
                  {data.powerWords.map((word, i) => (
                    <div key={i}>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Input value={word} onChange={(e) => {
                            const next = [...data.powerWords];
                            next[i] = e.target.value;
                            setData(prev => ({ ...prev, powerWords: next }));
                          }} className="h-7 text-xs w-28" />
                          <button onClick={() => setData(prev => ({ ...prev, powerWords: prev.powerWords.filter((_, idx) => idx !== i) }))}
                            className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <span className="text-sm px-3 py-1 rounded-md bg-muted/50 border border-border/40 text-foreground/80">{word}</span>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button onClick={() => setData(prev => ({ ...prev, powerWords: [...prev.powerWords, ""] }))}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"><Plus className="h-3 w-3" /> Add</button>
                  )}
                </div>
              </div>

              {/* Technical level */}
              <div>
                <SectionHeading id="technical-level" title="Technical level" subtitle="Recommended complexity and tone for product copy." />
                <div className="mt-3 rounded-lg border border-border/40 bg-muted/20 p-4">
                  {isEditing ? (
                    <Textarea
                      value={data.technicalLevel}
                      onChange={(e) => setData(prev => ({ ...prev, technicalLevel: e.target.value }))}
                      className="text-sm min-h-[60px] resize-none"
                    />
                  ) : (
                    <p className="text-sm text-foreground/80 leading-relaxed">{data.technicalLevel}</p>
                  )}
                </div>
              </div>

              <div className="border-b border-border/30" />

              {/* ── Content refinement ── */}
              <div>
                <SectionHeading id="content-refinement" title="Content refinement" subtitle="Quality assurance for product messaging." />
              </div>

              <div>
                <SectionHeading id="refinement-checklist" title="Refinement checklist" subtitle="Review these before publishing any product copy." />
                <BulletList items={data.refinementChecklist} icon={ListChecks} iconClass="text-primary" isEditing={isEditing} onChange={(r) => setData(prev => ({ ...prev, refinementChecklist: r }))} />
              </div>

              <div className="h-8" />
            </div>

            {/* Right sidebar */}
            <div className="hidden lg:block w-52 shrink-0">
              <ProductPageSidebar
                activeSection={activeSidebarSection}
                onSectionClick={(id) => {
                  setActiveSidebarSection(id);
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
