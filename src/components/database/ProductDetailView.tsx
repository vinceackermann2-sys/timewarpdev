import { useState } from "react";
import {
  Package, Tag, DollarSign, Zap, Target, Shield, Users, Lightbulb,
  Pencil, Save, X, Plus, Trash2, ArrowLeft,
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
  description: string;
  pricing: string;
  features: string[];
  benefits: string[];
  idealCustomer: string;
  painPoints: string[];
  useCases: string[];
  differentiators: string[];
  competitors: string[];
}

export const DEFAULT_PRODUCT: ProductData = {
  id: "",
  name: "My Product",
  category: "SaaS",
  description: "A brief description of what this product does and the value it delivers.",
  pricing: "$29/mo — Starter, $79/mo — Pro, $199/mo — Enterprise",
  features: [
    "AI-powered analytics dashboard",
    "Real-time collaboration tools",
    "Custom integrations via API",
    "White-label options for agencies",
  ],
  benefits: [
    "Save 10+ hours per week on manual reporting",
    "Increase team productivity by 40%",
    "Reduce churn with proactive insights",
  ],
  idealCustomer: "Small-to-mid-size B2B companies (10–200 employees) that need to streamline operations and make data-driven decisions faster.",
  painPoints: [
    "Data scattered across multiple tools with no single source of truth",
    "Manual reporting eats up team bandwidth",
    "Difficulty tracking ROI on campaigns and initiatives",
  ],
  useCases: [
    "Marketing teams tracking campaign performance across channels",
    "Operations managers optimizing workflows",
    "Founders preparing investor-ready reports in minutes",
  ],
  differentiators: [
    "All-in-one platform vs. stitching together 5+ tools",
    "AI-generated recommendations, not just dashboards",
    "Setup in under 10 minutes with auto-import",
  ],
  competitors: [
    "Tool A — strong analytics but no AI layer",
    "Tool B — good for enterprise, too complex for SMBs",
    "Tool C — affordable but limited integrations",
  ],
};

/* ── Section wrapper ── */
function ProductSection({
  id, icon: Icon, title, description, children,
}: {
  id: string; icon: React.ElementType; title: string; description: string; children: React.ReactNode;
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

/* ── Editable list ── */
function EditableList({
  items, isEditing, onChange,
}: {
  items: string[]; isEditing: boolean; onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-2 shrink-0" />
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
            <p className="text-sm text-muted-foreground/80">{item}</p>
          )}
        </div>
      ))}
      {isEditing && (
        <button
          onClick={() => onChange([...items, ""])}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
        >
          <Plus className="h-3 w-3" /> Add item
        </button>
      )}
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
  const [activeSidebarSection, setActiveSidebarSection] = useState("product-overview");

  const handleSave = () => {
    onSave(data);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setData(product);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Package className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{data.name}</h2>
              <p className="text-xs text-muted-foreground">{data.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <div className="flex-1 min-w-0 space-y-6">
              {/* ── Overview ── */}
              <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden" id="product-overview">
                <div className="px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Package className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Overview</h2>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <ProductSection id="product-name" icon={Tag} title="Name & Category" description="The product name and its primary category.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                      {isEditing ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Product Name</label>
                            <Input value={data.name} onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))} className="h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Category</label>
                            <Input value={data.category} onChange={(e) => setData(prev => ({ ...prev, category: e.target.value }))} className="h-9 text-sm" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Product Name</span>
                            <p className="text-sm text-foreground/90">{data.name}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Category</span>
                            <p className="text-sm text-foreground/90">{data.category}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </ProductSection>

                  <ProductSection id="product-description" icon={Package} title="Description" description="What this product does and the core value it delivers.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      {isEditing ? (
                        <Textarea value={data.description} onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))} className="text-sm min-h-[80px] resize-none" />
                      ) : (
                        <p className="text-sm text-muted-foreground/80 leading-relaxed">{data.description}</p>
                      )}
                    </div>
                  </ProductSection>

                  <ProductSection id="product-pricing" icon={DollarSign} title="Pricing" description="Pricing tiers or model for this product.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      {isEditing ? (
                        <Textarea value={data.pricing} onChange={(e) => setData(prev => ({ ...prev, pricing: e.target.value }))} className="text-sm min-h-[60px] resize-none" />
                      ) : (
                        <p className="text-sm text-muted-foreground/80 leading-relaxed">{data.pricing}</p>
                      )}
                    </div>
                  </ProductSection>
                </div>
              </div>

              {/* ── Features & Benefits ── */}
              <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden" id="product-features">
                <div className="px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Features & Benefits</h2>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <ProductSection id="key-features" icon={Zap} title="Key Features" description="The main features and capabilities of this product.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      <EditableList items={data.features} isEditing={isEditing} onChange={(f) => setData(prev => ({ ...prev, features: f }))} />
                    </div>
                  </ProductSection>

                  <ProductSection id="unique-benefits" icon={Lightbulb} title="Unique Benefits" description="The tangible outcomes and advantages users gain.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      <EditableList items={data.benefits} isEditing={isEditing} onChange={(b) => setData(prev => ({ ...prev, benefits: b }))} />
                    </div>
                  </ProductSection>
                </div>
              </div>

              {/* ── Target Audience ── */}
              <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden" id="product-audience">
                <div className="px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Target Audience</h2>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <ProductSection id="ideal-customer" icon={Users} title="Ideal Customer" description="Who this product is built for.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      {isEditing ? (
                        <Textarea value={data.idealCustomer} onChange={(e) => setData(prev => ({ ...prev, idealCustomer: e.target.value }))} className="text-sm min-h-[60px] resize-none" />
                      ) : (
                        <p className="text-sm text-muted-foreground/80 leading-relaxed">{data.idealCustomer}</p>
                      )}
                    </div>
                  </ProductSection>

                  <ProductSection id="pain-points" icon={Target} title="Pain Points" description="The specific problems this product solves.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      <EditableList items={data.painPoints} isEditing={isEditing} onChange={(p) => setData(prev => ({ ...prev, painPoints: p }))} />
                    </div>
                  </ProductSection>

                  <ProductSection id="use-cases" icon={Lightbulb} title="Use Cases" description="Real-world scenarios where this product shines.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      <EditableList items={data.useCases} isEditing={isEditing} onChange={(u) => setData(prev => ({ ...prev, useCases: u }))} />
                    </div>
                  </ProductSection>
                </div>
              </div>

              {/* ── Competitive Edge ── */}
              <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden" id="product-competitive">
                <div className="px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Shield className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Competitive Edge</h2>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  <ProductSection id="differentiators" icon={Shield} title="Differentiators" description="What sets this product apart from alternatives.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      <EditableList items={data.differentiators} isEditing={isEditing} onChange={(d) => setData(prev => ({ ...prev, differentiators: d }))} />
                    </div>
                  </ProductSection>

                  <ProductSection id="competitors" icon={Target} title="Competitors" description="Known competitors and how they compare.">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                      <EditableList items={data.competitors} isEditing={isEditing} onChange={(c) => setData(prev => ({ ...prev, competitors: c }))} />
                    </div>
                  </ProductSection>
                </div>
              </div>
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
