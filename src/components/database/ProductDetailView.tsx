import { useState, useRef } from "react";
import {
  Package, Pencil, Save, X, ArrowLeft, Upload, Trash2, Plus, Lock, Tag, Gift, Search,
  Sparkles, Check, CircleAlert, ChevronDown, ChevronUp, ImageIcon,
  Crosshair, Zap, ShieldCheck, MessageSquareWarning, Languages, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { ProductPageSidebar } from "@/components/database/ProductPageSidebar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";

/* ── Types ── */
export interface ProductOffer {
  id: string;
  title: string;
  originalPrice: string;
  salePrice: string;
  discount: string;
  bundleDetails: string;
  freeGifts: string[];
  isPopular: boolean;
}

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
  offers: ProductOffer[];
  positioningStatement: string;
  uniqueSellingPoints: string[];
  competitiveAdvantages: string[];
  commonObjections: { objection: string; response: string }[];
  proofPoints: { category: string; items: string[] }[];
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
  offers: [
    {
      id: "offer-1",
      title: "1 Month Supply",
      originalPrice: "€43,95",
      salePrice: "€25,95",
      discount: "Sale",
      bundleDetails: "1 Instant Dye Shampoo - 4 Month Supply",
      freeGifts: [],
      isPopular: false,
    },
    {
      id: "offer-2",
      title: "Buy 2 - Always Carry a Backup",
      originalPrice: "€43,95",
      salePrice: "€25,95",
      discount: "Sale",
      bundleDetails: "2 units - Always carry a backup",
      freeGifts: ["+ FREE 10$ Gift Card"],
      isPopular: true,
    },
    {
      id: "offer-3",
      title: "Buy 3 Get 4",
      originalPrice: "",
      salePrice: "",
      discount: "",
      bundleDetails: "3 units - For your girlies",
      freeGifts: ["+ FREE Gift"],
      isPopular: false,
    },
    {
      id: "offer-4",
      title: "Healing Spray Upsell",
      originalPrice: "€30,95",
      salePrice: "€21,95",
      discount: "Sale",
      bundleDetails: "Healing Spray - Leave-In Hair Serum (cart upsell add-on)",
      freeGifts: [],
      isPopular: false,
    },
  ],
  positioningStatement: "Hairsaver Instant Dye Shampoo is a 2-in-1 color-and-cleanse hair product that helps color-conscious individuals maintain vibrant, freshly dyed hair by delivering instant color during every wash — no mixing, no mess, no extra time required.",
  uniqueSellingPoints: [
    "Combines hair dyeing and shampooing into a single, simultaneous step — a true 2-in-1 innovation",
    "Instant color deposit activates during the normal wash cycle with no developer or mixing required",
    "Eliminates all traditional dye kit accessories — no gloves, bowls, brushes, or waiting time",
    "Designed for ongoing color maintenance use, not just one-time application",
    "Accessible salon-quality color results achievable at home by anyone, regardless of experience",
  ],
  competitiveAdvantages: [
    "Dramatically faster than traditional box dyes, which require 30–60 minutes of processing time",
    "Far less messy than conventional dye kits that risk staining skin, surfaces, and clothing",
    "More cost-effective than repeated salon visits for color touch-ups and root maintenance",
    "Lower barrier to use than standard at-home dyes — no mixing ratios or application tools needed",
    "Gentler on hair with repeated use compared to harsh oxidative dye formulas",
    "Doubles as a regular shampoo, replacing a product already in the user's routine",
  ],
  commonObjections: [
    { objection: "Will it actually dye my hair the same way a real dye does?", response: "Hairsaver works as a color-depositing and refreshing system — ideal for maintaining and enhancing existing color with every wash. For a dramatic first-time color change, a full dye treatment is still recommended, after which Hairsaver keeps your color looking freshly done far longer." },
    { objection: "Will it stain my skin, shower, or towels?", response: "The shampoo-based formula is designed to rinse cleanly from skin and surfaces. As with any color product, rinsing promptly and using a dark towel is recommended, but the risk of staining is significantly lower than with traditional dye kits." },
    { objection: "Is it safe to use every time I wash my hair?", response: "Yes — Hairsaver is formulated for regular, repeated use as a shampoo replacement. Its gentle cleansing agents are designed to deposit color without the harsh oxidative chemicals found in traditional dyes." },
    { objection: "Will it work on grey or resistant hair?", response: "Hairsaver is effective at toning and refreshing color on grey hair, particularly for blending and softening regrowth. For full grey coverage from scratch, combining with an initial full-color treatment will deliver the best results." },
    { objection: "How is this different from a color-depositing conditioner?", response: "Unlike color conditioners that are applied after shampooing, Hairsaver replaces your shampoo entirely — cleansing and depositing color in one step, saving time and simplifying your routine without adding an extra product." },
  ],
  proofPoints: [
    { category: "Ease of Use", items: [
      "No mixing, developer, or tools required",
      "Replaces existing shampoo — zero routine disruption",
      "Usable by anyone regardless of hair coloring experience",
    ]},
    { category: "Time & Convenience", items: [
      "Full color maintenance completed within a normal shower routine",
      "Eliminates 30–60 minute traditional dye processing sessions",
      "No cleanup of bowls, brushes, or gloves after use",
    ]},
    { category: "Cost Efficiency", items: [
      "Reduces frequency of costly salon color appointments",
      "Replaces both shampoo and color maintenance products in one purchase",
      "Extends the life of professional color treatments",
    ]},
  ],
  dosAndDonts: {
    dos: [
      "Use simple, action-oriented language that emphasizes speed and simplicity",
      "Highlight the 2-in-1 convenience angle in every key message",
      "Speak to the emotional payoff of effortlessly vibrant, fresh-looking hair",
      "Use before/after framing to contrast the old messy dye process with Hairsaver's simplicity",
      "Emphasize routine integration — 'just swap your shampoo'",
    ],
    donts: [
      "Avoid technical chemical or colorist jargon that could intimidate non-professional users",
      "Don't overpromise dramatic first-time color transformation — position as maintenance-first",
      "Avoid language that implies the product is only for salon professionals",
      "Don't use vague claims like 'revolutionary' without grounding them in a specific benefit",
      "Avoid comparing it directly to permanent dye — it serves a different, complementary purpose",
    ],
  },
  powerPhrases: [
    "Color while you wash",
    "Fresh color, every shower",
    "Swap your shampoo, save your color",
    "No mess, no mixing, no waiting",
    "Salon-fresh hair between appointments",
    "The easiest color maintenance routine you'll ever have",
  ],
  powerWords: [
    "Instant", "Effortless", "Vibrant", "Refresh", "Maintain", "Simple", "Convenient", "Everyday", "Fresh", "Seamless",
  ],
  technicalLevel: "Beginner",
  refinementChecklist: [
    "Confirm product is positioned as a color maintenance and refreshing tool — not a replacement for first-time full dye treatments",
    "Verify all application instructions specify wetting hair first and massaging from roots to ends",
    "Ensure no content implies the product works on dry hair or outside of the shower",
    "Check that frequency guidance (2–3x per week) is included in any tutorial or how-to content",
    "Avoid any visuals or copy that suggest skin, face, or body application — product is for scalp and hair only",
    "Confirm competitive comparisons do not make unsubstantiated quantitative claims without supporting data",
    "Ensure color result expectations are set realistically — gradual build-up over multiple washes, not single-use transformation",
    "Review all imagery to confirm hair (not face or skin) is the visual focal point",
    "Validate that 'instant' in the product name is contextualized correctly — instant application, not necessarily instant dramatic color change",
    "Check that any grey coverage claims are qualified appropriately (blending/toning vs. full coverage)",
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
  const { userName } = useBusinessDNA();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const toArr = <T,>(v: unknown): T[] => Array.isArray(v) ? v : [];
  const safeProduct: ProductData = {
    ...DEFAULT_PRODUCT,
    ...product,
    features: toArr(product.features),
    benefits: toArr(product.benefits),
    painPoints: toArr(product.painPoints),
    useCases: toArr(product.useCases),
    targetScenarios: toArr(product.targetScenarios),
    uniqueSellingPoints: toArr(product.uniqueSellingPoints),
    competitiveAdvantages: toArr(product.competitiveAdvantages),
    commonObjections: toArr<any>(product.commonObjections).map(o => ({
      objection: o?.objection || "",
      response: o?.response || "",
    })),
    proofPoints: toArr<any>(product.proofPoints).map(pp => ({
      category: pp?.category || "General",
      items: toArr(pp?.items),
    })),
    dosAndDonts: {
      dos: toArr(product.dosAndDonts?.dos),
      donts: toArr(product.dosAndDonts?.donts),
    },
    powerPhrases: toArr(product.powerPhrases),
    powerWords: toArr(product.powerWords),
    technicalLevel: product.technicalLevel || "",
    refinementChecklist: toArr(product.refinementChecklist),
    images: toArr(product.images),
    offers: toArr<any>(product.offers).map(o => ({
      ...o,
      freeGifts: toArr(o?.freeGifts),
    })),
  };
  const [data, setData] = useState<ProductData>(safeProduct);
  const [descExpanded, setDescExpanded] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState("product-overview");

  const isEditingSection = (section: string) => editingSection === section;

  const handleSave = () => {
    onSave(data);
    setEditingSection(null);
  };

  const handleCancel = () => {
    setData(safeProduct);
    setEditingSection(null);
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
              <h1 className="text-xl font-bold text-foreground truncate">{data.name}</h1>
            </div>
            <div className="flex items-center gap-3 mt-1.5 ml-10">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                Visibility: <Lock className="h-3 w-3" /> Private
              </span>
              <span className="text-xs text-muted-foreground/60">|</span>
              <span className="text-xs text-muted-foreground">Last updated: {data.lastUpdated}</span>
              <span className="text-xs text-muted-foreground/60">|</span>
              <span className="text-xs text-muted-foreground">Added by: {userName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-8">

              {/* ── Product overview card ── */}
              <div id="product-overview" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Package className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Product overview</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingSection("overview") ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setData(product); setEditingSection(null); }} className="gap-1.5 text-muted-foreground"><X className="h-4 w-4" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditingSection("overview")} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
                    )}
                  </div>
                </div>
                <div className="px-6 py-6 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {data.images.map((img) => (
                      <ProductImageSlot key={img.id} slot={img} isEditing={isEditingSection("overview")} onUpload={handleImageUpload} onRemove={handleImageRemove} />
                    ))}
                  </div>
                  {isEditingSection("overview") && (
                    <button onClick={() => setData(prev => ({ ...prev, images: [...prev.images, { id: `img-${Date.now()}`, url: null, label: `Product Image ${prev.images.length + 1}` }] }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                      <Plus className="h-3 w-3" /> Add image slot
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground text-center">{data.images.length} product images</p>

                  <div id="product-description" className="space-y-2">
                    <SectionHeading id="" title="Product description" subtitle="Summary of what your product is, its core purpose, and who it's designed for." />
                    {isEditingSection("overview") ? (
                      <Textarea value={data.description} onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))} className="text-sm min-h-[100px] resize-none mt-3" />
                    ) : (
                      <p className="text-sm text-foreground/80 leading-relaxed mt-3">{data.description}</p>
                    )}
                  </div>

                  <button onClick={() => setDescExpanded(!descExpanded)} className="flex items-center gap-1.5 text-sm font-medium text-foreground mx-auto hover:text-primary transition-colors">
                    {descExpanded ? "Less detail" : "More detail"}
                    {descExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <AnimatePresence>
                    {descExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden space-y-8">
                        <div className="border-t border-border/30 pt-6">
                          <SectionHeading id="key-features" title="Key features" subtitle="Core functional capabilities that define your product." />
                          <BulletList items={data.features} icon={Sparkles} iconClass="text-muted-foreground" isEditing={isEditingSection("overview")} onChange={(f) => setData(prev => ({ ...prev, features: f }))} />
                        </div>
                        <div>
                          <SectionHeading id="key-benefits" title="Key benefits" subtitle="Value that users gain from your product's features." />
                          <BulletList items={data.benefits} icon={Check} iconClass="text-emerald-500" isEditing={isEditingSection("overview")} onChange={(b) => setData(prev => ({ ...prev, benefits: b }))} />
                        </div>
                        <div>
                          <SectionHeading id="target-pain-points" title="Target pain points" subtitle="Specific problems your product solves for users." />
                          <BulletList items={data.painPoints} icon={CircleAlert} iconClass="text-muted-foreground" isEditing={isEditingSection("overview")} onChange={(p) => setData(prev => ({ ...prev, painPoints: p }))} />
                        </div>
                        <div>
                          <SectionHeading id="primary-use-cases" title="Primary use cases" subtitle="Main scenarios where users apply your product." />
                          <BulletList items={data.useCases} icon={Check} iconClass="text-emerald-500" isEditing={isEditingSection("overview")} onChange={(u) => setData(prev => ({ ...prev, useCases: u }))} />
                        </div>
                        <div>
                          <SectionHeading id="target-scenarios" title="Target scenarios" subtitle="Specific situations or triggers that lead users to need your product." />
                          <BulletList items={data.targetScenarios} icon={Crosshair} iconClass="text-muted-foreground" isEditing={isEditingSection("overview")} onChange={(s) => setData(prev => ({ ...prev, targetScenarios: s }))} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Offers ── */}
              <div id="product-offers" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Tag className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Offers</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingSection("offers") ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setData(product); setEditingSection(null); }} className="gap-1.5 text-muted-foreground"><X className="h-4 w-4" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditingSection("offers")} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
                    )}
                  </div>
                </div>
                <div className="px-6 py-6 space-y-4">
                  {data.offers.map((offer, i) => (
                    <div key={offer.id} className="rounded-xl border border-border/40 bg-muted/20 p-5 space-y-2 relative">
                      {isEditingSection("offers") ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">Offer Title</label>
                            <button onClick={() => setData(prev => ({ ...prev, offers: prev.offers.filter((_, idx) => idx !== i) }))} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </div>
                          <Input value={offer.title} onChange={(e) => { const next = [...data.offers]; next[i] = { ...next[i], title: e.target.value }; setData(prev => ({ ...prev, offers: next })); }} className="h-9 text-sm" />
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Original Price</label>
                              <Input value={offer.originalPrice} onChange={(e) => { const next = [...data.offers]; next[i] = { ...next[i], originalPrice: e.target.value }; setData(prev => ({ ...prev, offers: next })); }} placeholder="e.g., €69.90" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Sale Price</label>
                              <Input value={offer.salePrice} onChange={(e) => { const next = [...data.offers]; next[i] = { ...next[i], salePrice: e.target.value }; setData(prev => ({ ...prev, offers: next })); }} placeholder="e.g., €24.95" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Discount</label>
                              <Input value={offer.discount} onChange={(e) => { const next = [...data.offers]; next[i] = { ...next[i], discount: e.target.value }; setData(prev => ({ ...prev, offers: next })); }} placeholder="e.g., 65% OFF" className="h-9 text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Bundle Details</label>
                            <Input value={offer.bundleDetails} onChange={(e) => { const next = [...data.offers]; next[i] = { ...next[i], bundleDetails: e.target.value }; setData(prev => ({ ...prev, offers: next })); }} className="h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Free Gifts</label>
                            {offer.freeGifts.map((gift, gi) => (
                              <div key={gi} className="flex gap-1.5">
                                <Input value={gift} onChange={(e) => { const next = [...data.offers]; const gifts = [...next[i].freeGifts]; gifts[gi] = e.target.value; next[i] = { ...next[i], freeGifts: gifts }; setData(prev => ({ ...prev, offers: next })); }} className="h-8 text-sm flex-1" />
                                <button onClick={() => { const next = [...data.offers]; next[i] = { ...next[i], freeGifts: next[i].freeGifts.filter((_, idx) => idx !== gi) }; setData(prev => ({ ...prev, offers: next })); }} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ))}
                            <button onClick={() => { const next = [...data.offers]; next[i] = { ...next[i], freeGifts: [...next[i].freeGifts, ""] }; setData(prev => ({ ...prev, offers: next })); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 rounded-lg border border-dashed border-border/50 hover:border-border">
                              <Plus className="h-3.5 w-3.5" /> Add Free Gift
                            </button>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={offer.isPopular} onChange={(e) => { const next = [...data.offers]; next[i] = { ...next[i], isPopular: e.target.checked }; setData(prev => ({ ...prev, offers: next })); }} className="rounded border-border" />
                            <span className="text-sm text-muted-foreground">Mark as popular/bestseller</span>
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-base font-semibold text-foreground">{offer.title}</h4>
                            {offer.isPopular && <span className="text-xs px-2 py-0.5 rounded-md bg-muted border border-border/50 text-muted-foreground font-medium">Popular</span>}
                          </div>
                          {(offer.originalPrice || offer.salePrice) && (
                            <div className="flex items-center gap-2">
                              {offer.originalPrice && <span className="text-sm text-muted-foreground line-through">{offer.originalPrice}</span>}
                              {offer.salePrice && <span className="text-base font-semibold text-foreground">{offer.salePrice}</span>}
                              {offer.discount && <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-medium">{offer.discount}</span>}
                            </div>
                          )}
                          {offer.bundleDetails && <p className="text-sm text-muted-foreground">Includes: {offer.bundleDetails}</p>}
                          {offer.freeGifts.length > 0 && (
                            <div className="space-y-1">
                              {offer.freeGifts.map((gift, gi) => (
                                <div key={gi} className="flex items-center gap-1.5 text-sm text-foreground"><Gift className="h-3.5 w-3.5 text-muted-foreground" /><span>{gift}</span></div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {isEditingSection("offers") && (
                    <button onClick={() => setData(prev => ({ ...prev, offers: [...prev.offers, { id: `offer-${Date.now()}`, title: "", originalPrice: "", salePrice: "", discount: "", bundleDetails: "", freeGifts: [], isPopular: false }] }))} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-3 rounded-xl border border-dashed border-border/50 hover:border-border">
                      <Plus className="h-4 w-4" /> Add Another Offer
                    </button>
                  )}
                </div>
              </div>

              {/* ── Value proposition ── */}
              <div id="value-proposition" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Value proposition</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingSection("value") ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setData(product); setEditingSection(null); }} className="gap-1.5 text-muted-foreground"><X className="h-4 w-4" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditingSection("value")} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
                    )}
                  </div>
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <div>
                    <SectionHeading id="positioning-statement" title="Positioning statement" subtitle="" />
                    {isEditingSection("value") ? (
                      <Textarea value={data.positioningStatement} onChange={(e) => setData(prev => ({ ...prev, positioningStatement: e.target.value }))} className="text-sm min-h-[60px] resize-none mt-3" />
                    ) : (
                      <p className="text-sm text-foreground/80 leading-relaxed mt-3">{data.positioningStatement}</p>
                    )}
                  </div>
                  <div>
                    <SectionHeading id="unique-selling-points" title="Unique selling points" subtitle="What makes your product stand out from alternatives." />
                    <BulletList items={data.uniqueSellingPoints} icon={Zap} iconClass="text-muted-foreground" isEditing={isEditingSection("value")} onChange={(u) => setData(prev => ({ ...prev, uniqueSellingPoints: u }))} />
                  </div>
                  <div>
                    <SectionHeading id="competitive-advantages" title="Competitive advantages" subtitle="Structural advantages over competitors." />
                    <BulletList items={data.competitiveAdvantages} icon={ShieldCheck} iconClass="text-muted-foreground" isEditing={isEditingSection("value")} onChange={(c) => setData(prev => ({ ...prev, competitiveAdvantages: c }))} />
                  </div>
                </div>
              </div>

              {/* ── Objections & proof points ── */}
              <div id="objections-proof" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <MessageSquareWarning className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Objections & proof points</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingSection("objections") ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setData(product); setEditingSection(null); }} className="gap-1.5 text-muted-foreground"><X className="h-4 w-4" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditingSection("objections")} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
                    )}
                  </div>
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <div id="common-objections" className="space-y-3">
                    <SectionHeading id="" title="Common objections and responses" subtitle="Anticipated concerns and how to address them." />
                    <div className="space-y-6 mt-3">
                      {data.commonObjections.map((obj, i) => (
                        <div key={i} className="space-y-1.5">
                          {isEditingSection("objections") ? (
                            <div className="space-y-2 rounded-lg border border-border/40 bg-muted/10 p-4">
                              <div className="flex gap-1.5">
                                <Input value={obj.objection} onChange={(e) => { const next = [...data.commonObjections]; next[i] = { ...next[i], objection: e.target.value }; setData(prev => ({ ...prev, commonObjections: next })); }} placeholder="Objection question" className="h-8 text-sm flex-1" />
                                <button onClick={() => setData(prev => ({ ...prev, commonObjections: prev.commonObjections.filter((_, idx) => idx !== i) }))} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                              </div>
                              <Textarea value={obj.response} onChange={(e) => { const next = [...data.commonObjections]; next[i] = { ...next[i], response: e.target.value }; setData(prev => ({ ...prev, commonObjections: next })); }} placeholder="Response" className="text-sm min-h-[60px] resize-none" />
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-foreground">"{obj.objection}"</p>
                              <p className="text-sm text-muted-foreground/80 ml-4 leading-relaxed">{obj.response}</p>
                            </>
                          )}
                        </div>
                      ))}
                      {isEditingSection("objections") && (
                        <button onClick={() => setData(prev => ({ ...prev, commonObjections: [...prev.commonObjections, { objection: "", response: "" }] }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"><Plus className="h-3 w-3" /> Add objection</button>
                      )}
                    </div>
                  </div>
                  <div id="proof-points">
                    <SectionHeading id="" title="Proof points and evidence types" subtitle="Evidence that supports your product claims." />
                    <div className="space-y-6 mt-4">
                      {data.proofPoints.map((group, gi) => (
                        <div key={gi}>
                          <h4 className="text-sm font-bold text-foreground mb-2">{group.category}</h4>
                          <div className="space-y-2">
                            {group.items.map((item, ii) => (
                              <div key={ii} className="flex items-start gap-2.5">
                                <Search className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                {isEditingSection("objections") ? (
                                  <div className="flex-1 flex gap-1.5">
                                    <Input value={item} onChange={(e) => {
                                      const next = [...data.proofPoints];
                                      const items = [...next[gi].items];
                                      items[ii] = e.target.value;
                                      next[gi] = { ...next[gi], items };
                                      setData(prev => ({ ...prev, proofPoints: next }));
                                    }} className="h-8 text-sm flex-1" />
                                    <button onClick={() => {
                                      const next = [...data.proofPoints];
                                      next[gi] = { ...next[gi], items: next[gi].items.filter((_, idx) => idx !== ii) };
                                      setData(prev => ({ ...prev, proofPoints: next }));
                                    }} className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-foreground/80">{item}</span>
                                )}
                              </div>
                            ))}
                            {isEditingSection("objections") && (
                              <button onClick={() => {
                                const next = [...data.proofPoints];
                                next[gi] = { ...next[gi], items: [...next[gi].items, ""] };
                                setData(prev => ({ ...prev, proofPoints: next }));
                              }} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 ml-6"><Plus className="h-3 w-3" /> Add item</button>
                            )}
                          </div>
                        </div>
                      ))}
                      {isEditingSection("objections") && (
                        <button onClick={() => setData(prev => ({ ...prev, proofPoints: [...prev.proofPoints, { category: "New Category", items: [""] }] }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"><Plus className="h-3 w-3" /> Add category</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Language patterns ── */}
              <div id="language-patterns" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Languages className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Language patterns</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingSection("language") ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setData(product); setEditingSection(null); }} className="gap-1.5 text-muted-foreground"><X className="h-4 w-4" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditingSection("language")} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
                    )}
                  </div>
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  {/* Do's and Don'ts */}
                  <div id="dos-and-donts" className="space-y-6">
                    <SectionHeading id="" title="Do's and Don'ts" subtitle="" />
                    <div className="space-y-6 mt-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-foreground">Do's</h4>
                        {data.dosAndDonts.dos.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            {isEditingSection("language") ? (
                              <div className="flex-1 flex gap-1">
                                <Input value={item} onChange={(e) => { const next = [...data.dosAndDonts.dos]; next[i] = e.target.value; setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: next } })); }} className="h-8 text-sm flex-1" />
                                <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: prev.dosAndDonts.dos.filter((_, idx) => idx !== i) } }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <span className="text-sm text-foreground/80">{item}</span>
                            )}
                          </div>
                        ))}
                        {isEditingSection("language") && (
                          <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, dos: [...prev.dosAndDonts.dos, ""] } }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 ml-6"><Plus className="h-3 w-3" /> Add</button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-foreground">Don'ts</h4>
                        {data.dosAndDonts.donts.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <X className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                            {isEditingSection("language") ? (
                              <div className="flex-1 flex gap-1">
                                <Input value={item} onChange={(e) => { const next = [...data.dosAndDonts.donts]; next[i] = e.target.value; setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: next } })); }} className="h-8 text-sm flex-1" />
                                <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: prev.dosAndDonts.donts.filter((_, idx) => idx !== i) } }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <span className="text-sm text-foreground/80">{item}</span>
                            )}
                          </div>
                        ))}
                        {isEditingSection("language") && (
                          <button onClick={() => setData(prev => ({ ...prev, dosAndDonts: { ...prev.dosAndDonts, donts: [...prev.dosAndDonts.donts, ""] } }))} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 ml-6"><Plus className="h-3 w-3" /> Add</button>
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
                          {isEditingSection("language") ? (
                            <div className="flex gap-1">
                              <Input value={phrase} onChange={(e) => { const next = [...data.powerPhrases]; next[i] = e.target.value; setData(prev => ({ ...prev, powerPhrases: next })); }} className="h-7 text-xs w-52" />
                              <button onClick={() => setData(prev => ({ ...prev, powerPhrases: prev.powerPhrases.filter((_, idx) => idx !== i) }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <span className="text-sm px-3 py-1.5 rounded-full bg-muted text-foreground font-medium">"{phrase}"</span>
                          )}
                        </div>
                      ))}
                      {isEditingSection("language") && (
                        <button onClick={() => setData(prev => ({ ...prev, powerPhrases: [...prev.powerPhrases, ""] }))} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"><Plus className="h-3 w-3" /> Add</button>
                      )}
                    </div>
                  </div>

                  {/* Power words */}
                  <div>
                    <SectionHeading id="power-words" title="Power words" subtitle="Single words that resonate with your audience." />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {data.powerWords.map((word, i) => (
                        <div key={i}>
                          {isEditingSection("language") ? (
                            <div className="flex gap-1">
                              <Input value={word} onChange={(e) => { const next = [...data.powerWords]; next[i] = e.target.value; setData(prev => ({ ...prev, powerWords: next })); }} className="h-7 text-xs w-28" />
                              <button onClick={() => setData(prev => ({ ...prev, powerWords: prev.powerWords.filter((_, idx) => idx !== i) }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <span className="text-sm px-3 py-1 rounded-md bg-muted/50 border border-border/40 text-foreground/80">{word}</span>
                          )}
                        </div>
                      ))}
                      {isEditingSection("language") && (
                        <button onClick={() => setData(prev => ({ ...prev, powerWords: [...prev.powerWords, ""] }))} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"><Plus className="h-3 w-3" /> Add</button>
                      )}
                    </div>
                  </div>

                  {/* Technical level */}
                  <div>
                    <SectionHeading id="technical-level" title="Technical level" subtitle="" />
                    <div className="mt-2">
                      {isEditingSection("language") ? (
                        <Input value={data.technicalLevel} onChange={(e) => setData(prev => ({ ...prev, technicalLevel: e.target.value }))} className="h-9 text-sm" />
                      ) : (
                        <p className="text-sm text-foreground/80">{data.technicalLevel}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Content refinement ── */}
              <div id="content-refinement" className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <ListChecks className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">Content refinement</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingSection("refinement") ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setData(product); setEditingSection(null); }} className="gap-1.5 text-muted-foreground"><X className="h-4 w-4" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setEditingSection("refinement")} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
                    )}
                  </div>
                </div>
                <div className="px-6 py-6 max-w-3xl">
                  <SectionHeading id="refinement-checklist" title="Refinement checklist" subtitle="Review these before publishing any product copy." />
                  <BulletList items={data.refinementChecklist} icon={ListChecks} iconClass="text-muted-foreground" isEditing={isEditingSection("refinement")} onChange={(r) => setData(prev => ({ ...prev, refinementChecklist: r }))} />
                </div>
              </div>

              <div className="h-8" />
            </div>

            {/* Right sidebar */}
            <div className="hidden lg:block w-52 shrink-0 self-start">
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
      </div>
    </div>
  );
}
