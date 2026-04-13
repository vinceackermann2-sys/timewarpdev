import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ClipboardCheck,
  RefreshCw,
  ListTodo,
  Award,
  Clock,
  Building2,
  ChevronDown,
  Plug,
  ShoppingBag,
  Users,
  Palette,
  Image,
  Bot,
  FileText,
  AlertTriangle,
  Lightbulb,
  Target,
  TrendingUp,
  CheckCircle2,
  X,
  Plus,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusinessDNA, BrandEntry } from "./BusinessDNAContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: "Briefing", label: "Briefing", icon: ClipboardCheck },
  { id: "Updates", label: "Updates", icon: RefreshCw },
  { id: "To-Dos", label: "To-Dos", icon: ListTodo },
  { id: "Objectives", label: "Objectives", icon: Award },
];

interface DashboardCard {
  id: string;
  priority: "High" | "Medium" | "Low";
  title: string;
  description: string;
  icon: React.ElementType;
  badgeVariant: "high" | "medium" | "low";
  actionText?: string;
  timeAgo?: string;
  category?: string;
}

const badgeClasses: Record<string, string> = {
  high: "bg-destructive/80 text-destructive-foreground",
  medium: "bg-[hsl(45,93%,47%)]/80 text-white",
  low: "bg-emerald-500/80 text-white",
};

/* ------------------------------------------------------------------ */
/*  Connection status hook                                             */
/* ------------------------------------------------------------------ */
function useConnections(brandId?: string) {
  const [connections, setConnections] = useState<{ provider: string; status: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      let q = supabase.from("user_connections").select("provider, status").eq("user_id", session.user.id);
      if (brandId) q = q.eq("brand_id", brandId);
      const { data } = await q;
      if (!cancelled && data) setConnections(data);
    })();
    return () => { cancelled = true; };
  }, [brandId]);

  return connections;
}

/* ------------------------------------------------------------------ */
/*  Card builders                                                      */
/* ------------------------------------------------------------------ */
const AVAILABLE_INTEGRATIONS = ["google", "microsoft_outlook", "microsoft_onedrive", "microsoft_onenote", "slack", "zoom", "hubspot"];

function buildBriefingCards(
  brand: BrandEntry,
  products: { brandId?: string }[],
  audiences: { brandId?: string }[],
  connections: { provider: string; status: string }[],
): DashboardCard[] {
  const cards: DashboardCard[] = [];
  const brandProducts = products.filter((p) => p.brandId === brand.id);
  const brandAudiences = audiences.filter((a) => a.brandId === brand.id);
  const connectedProviders = connections.filter((c) => c.status === "connected").map((c) => c.provider);

  // Brand health overview
  const healthItems: string[] = [];
  if (brand.logoUrls?.length) healthItems.push(`${brand.logoUrls.length} logo(s)`);
  if (brand.colors) healthItems.push("Colors set");
  if (brand.typography) healthItems.push("Typography set");
  const healthScore = healthItems.length;

  cards.push({
    id: `${brand.id}-health`,
    priority: healthScore >= 3 ? "Low" : healthScore >= 1 ? "Medium" : "High",
    title: "Brand Health",
    description: healthScore >= 3
      ? `${brand.name} is well configured: ${healthItems.join(", ")}.`
      : `${brand.name} needs attention — only ${healthScore}/3 brand essentials configured.`,
    icon: Palette,
    badgeVariant: healthScore >= 3 ? "low" : healthScore >= 1 ? "medium" : "high",
    category: "Brand",
  });

  // Products briefing
  cards.push({
    id: `${brand.id}-products`,
    priority: brandProducts.length > 0 ? "Low" : "Medium",
    title: "Products",
    description: brandProducts.length > 0
      ? `${brandProducts.length} product(s) registered for ${brand.name}.`
      : `No products added yet for ${brand.name}. Add products to enable AI-powered insights.`,
    icon: ShoppingBag,
    badgeVariant: brandProducts.length > 0 ? "low" : "medium",
    category: "Data",
  });

  // Audiences briefing
  cards.push({
    id: `${brand.id}-audiences`,
    priority: brandAudiences.length > 0 ? "Low" : "Medium",
    title: "Audiences",
    description: brandAudiences.length > 0
      ? `${brandAudiences.length} audience(s) defined for ${brand.name}.`
      : `No audiences defined yet. Define target audiences for better marketing.`,
    icon: Users,
    badgeVariant: brandAudiences.length > 0 ? "low" : "medium",
    category: "Data",
  });

  // Connections briefing
  const connectedCount = connectedProviders.length;
  cards.push({
    id: `${brand.id}-connections`,
    priority: connectedCount >= 2 ? "Low" : connectedCount >= 1 ? "Medium" : "High",
    title: "Integrations",
    description: connectedCount > 0
      ? `${connectedCount} integration(s) active: ${connectedProviders.join(", ")}. ${AVAILABLE_INTEGRATIONS.length - connectedCount} more available.`
      : `No integrations connected. Connect tools like Slack, HubSpot, or Outlook to unlock full potential.`,
    icon: Plug,
    badgeVariant: connectedCount >= 2 ? "low" : connectedCount >= 1 ? "medium" : "high",
    category: "Integrations",
  });

  // Visual identity briefing
  const vi = brand.visualIdentity;
  const assetCount = (vi?.moodboardUrls?.length || 0) + (vi?.illustrationUrls?.length || 0) + (vi?.socialMediaUrls?.length || 0);
  cards.push({
    id: `${brand.id}-visual`,
    priority: assetCount > 0 ? "Low" : "Medium",
    title: "Visual Assets",
    description: assetCount > 0
      ? `${assetCount} visual asset(s) generated — moodboards, illustrations, social templates.`
      : "Visual assets are still being generated or haven't been created yet.",
    icon: Image,
    badgeVariant: assetCount > 0 ? "low" : "medium",
    category: "Brand",
  });

  // AI Agent briefing
  if (brand.agentName) {
    cards.push({
      id: `${brand.id}-agent`,
      priority: "Low",
      title: `AI Agent: ${brand.agentName}`,
      description: `Agent "${brand.agentName}" is active for ${brand.name}. Safety settings and behavior are configured.`,
      icon: Bot,
      badgeVariant: "low",
      category: "AI",
    });
  }

  return cards;
}

function buildUpdateCards(
  brand: BrandEntry,
  products: { brandId?: string; name?: string; lastUpdated?: string }[],
  audiences: { brandId?: string; name?: string; lastUpdated?: string }[],
): DashboardCard[] {
  const cards: DashboardCard[] = [];
  const brandProducts = products.filter((p) => p.brandId === brand.id);
  const brandAudiences = audiences.filter((a) => a.brandId === brand.id);

  if (brand.lastUpdated) {
    cards.push({
      id: `${brand.id}-brand-update`,
      priority: "Low",
      title: "Brand Updated",
      description: `${brand.name} brand profile was last updated.`,
      icon: Palette,
      badgeVariant: "low",
      timeAgo: brand.lastUpdated,
      category: "Brand",
    });
  }

  brandProducts.forEach((p: any, i: number) => {
    cards.push({
      id: `${brand.id}-prod-update-${i}`,
      priority: "Low",
      title: `Product: ${p.name || "Unnamed"}`,
      description: `Product "${p.name || "Unnamed"}" was added or updated.`,
      icon: ShoppingBag,
      badgeVariant: "low",
      timeAgo: p.lastUpdated || "recently",
      category: "Product",
    });
  });

  brandAudiences.forEach((a: any, i: number) => {
    cards.push({
      id: `${brand.id}-aud-update-${i}`,
      priority: "Low",
      title: `Audience: ${a.name || "Unnamed"}`,
      description: `Audience "${a.name || "Unnamed"}" was defined or updated.`,
      icon: Users,
      badgeVariant: "low",
      timeAgo: a.lastUpdated || "recently",
      category: "Audience",
    });
  });

  if (cards.length === 0) {
    cards.push({
      id: `${brand.id}-no-updates`,
      priority: "Low",
      title: "No recent updates",
      description: `No recent activity detected for ${brand.name}. Start by updating your brand profile or adding products.`,
      icon: RefreshCw,
      badgeVariant: "low",
      category: "Info",
    });
  }

  return cards;
}

function buildTodoCards(
  brand: BrandEntry,
  products: { brandId?: string }[],
  audiences: { brandId?: string }[],
  connections: { provider: string; status: string }[],
): DashboardCard[] {
  const cards: DashboardCard[] = [];
  const brandProducts = products.filter((p) => p.brandId === brand.id);
  const brandAudiences = audiences.filter((a) => a.brandId === brand.id);
  const connectedProviders = connections.filter((c) => c.status === "connected").map((c) => c.provider);

  // Problems / gaps
  if (!brand.logoUrls?.length) {
    cards.push({
      id: `${brand.id}-todo-logo`,
      priority: "High",
      title: "Upload a Logo",
      description: `${brand.name} has no logo uploaded. A logo is essential for brand recognition across all channels.`,
      icon: AlertTriangle,
      badgeVariant: "high",
      actionText: "Go to Brand",
      category: "Problem",
    });
  }
  if (!brand.colors) {
    cards.push({
      id: `${brand.id}-todo-colors`,
      priority: "High",
      title: "Define Brand Colors",
      description: "No brand colors configured. Colors ensure consistency across all generated materials.",
      icon: Palette,
      badgeVariant: "high",
      actionText: "Go to Brand",
      category: "Problem",
    });
  }
  if (brandProducts.length === 0) {
    cards.push({
      id: `${brand.id}-todo-products`,
      priority: "Medium",
      title: "Add Your First Product",
      description: "No products added yet. Adding products helps AI generate targeted marketing content.",
      icon: ShoppingBag,
      badgeVariant: "medium",
      actionText: "Go to Products",
      category: "Problem",
    });
  }
  if (brandAudiences.length === 0) {
    cards.push({
      id: `${brand.id}-todo-audiences`,
      priority: "Medium",
      title: "Define Target Audiences",
      description: "No audiences defined. Clear audience segments improve content personalization.",
      icon: Users,
      badgeVariant: "medium",
      actionText: "Go to Audiences",
      category: "Problem",
    });
  }
  if (connectedProviders.length === 0) {
    cards.push({
      id: `${brand.id}-todo-connect`,
      priority: "Medium",
      title: "Connect an Integration",
      description: "No integrations connected. Connect Slack, HubSpot, or email to unlock collaboration features.",
      icon: Plug,
      badgeVariant: "medium",
      actionText: "Go to Connectors",
      category: "Problem",
    });
  }

  // Suggestions for improvement
  cards.push({
    id: `${brand.id}-suggest-seo`,
    priority: "Low",
    title: "Review SEO Strategy",
    description: "Analyze your product descriptions and brand messaging for search engine optimization opportunities.",
    icon: Lightbulb,
    badgeVariant: "low",
    category: "Suggestion",
  });

  if (brandProducts.length > 0 && brandAudiences.length === 0) {
    cards.push({
      id: `${brand.id}-suggest-audience`,
      priority: "Low",
      title: "Create Audiences for Products",
      description: "You have products but no audiences. Creating audience segments will improve targeting.",
      icon: Lightbulb,
      badgeVariant: "low",
      category: "Suggestion",
    });
  }

  if (!brand.visualIdentity?.socialMediaUrls?.length) {
    cards.push({
      id: `${brand.id}-suggest-social`,
      priority: "Low",
      title: "Generate Social Media Templates",
      description: "Create branded social media templates to maintain consistency across platforms.",
      icon: Lightbulb,
      badgeVariant: "low",
      category: "Suggestion",
    });
  }

  return cards;
}

function buildObjectiveCards(
  brand: BrandEntry,
  products: { brandId?: string }[],
  audiences: { brandId?: string }[],
  connections: { provider: string; status: string }[],
  customObjectives: { id: string; title: string; description: string }[],
): DashboardCard[] {
  const cards: DashboardCard[] = [];
  const brandProducts = products.filter((p) => p.brandId === brand.id);
  const brandAudiences = audiences.filter((a) => a.brandId === brand.id);
  const connectedCount = connections.filter((c) => c.status === "connected").length;

  // Custom objectives first
  customObjectives.forEach((obj) => {
    cards.push({
      id: obj.id,
      priority: "High",
      title: obj.title,
      description: obj.description,
      icon: Target,
      badgeVariant: "high",
      category: "Custom",
    });
  });

  // Suggested objectives based on business state
  cards.push({
    id: `${brand.id}-obj-complete-profile`,
    priority: (!brand.logoUrls?.length || !brand.colors || !brand.typography) ? "High" : "Low",
    title: "Complete Brand Profile",
    description: "Ensure logo, colors, and typography are all configured for a polished brand identity.",
    icon: Target,
    badgeVariant: (!brand.logoUrls?.length || !brand.colors || !brand.typography) ? "high" : "low",
    category: "Suggested",
  });

  if (brandProducts.length < 3) {
    cards.push({
      id: `${brand.id}-obj-products`,
      priority: "Medium",
      title: "Catalog 3+ Products",
      description: "Adding multiple products enables comparative analysis and cross-selling recommendations.",
      icon: TrendingUp,
      badgeVariant: "medium",
      category: "Suggested",
    });
  }

  if (brandAudiences.length < 2) {
    cards.push({
      id: `${brand.id}-obj-audiences`,
      priority: "Medium",
      title: "Define 2+ Audience Segments",
      description: "Multiple audience segments allow for differentiated messaging and better conversion rates.",
      icon: Users,
      badgeVariant: "medium",
      category: "Suggested",
    });
  }

  if (connectedCount < 3) {
    cards.push({
      id: `${brand.id}-obj-integrations`,
      priority: "Medium",
      title: "Connect 3+ Integrations",
      description: "More integrations mean richer data and more automated workflows for your business.",
      icon: Plug,
      badgeVariant: "medium",
      category: "Suggested",
    });
  }

  cards.push({
    id: `${brand.id}-obj-ai-agent`,
    priority: brand.agentName ? "Low" : "Medium",
    title: "Set Up AI Agent",
    description: brand.agentName
      ? `Agent "${brand.agentName}" is active. Consider refining safety settings.`
      : "Create an AI agent to automate responses and customer interactions.",
    icon: Bot,
    badgeVariant: brand.agentName ? "low" : "medium",
    category: "Suggested",
  });

  return cards;
}

/* ------------------------------------------------------------------ */
/*  Card Component                                                     */
/* ------------------------------------------------------------------ */
function DashCard({ card }: { card: DashboardCard }) {
  const Icon = card.icon;
  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full max-w-[340px] flex flex-col gap-3 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${badgeClasses[card.badgeVariant]}`}>
            {card.priority}
          </span>
          {card.category && (
            <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
              {card.category}
            </span>
          )}
        </div>
        <div className="bg-muted/60 border border-border/40 p-1 rounded flex items-center justify-center w-7 h-7">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-3">{card.description}</p>
      {card.timeAgo && (
        <div className="flex items-center text-muted-foreground text-[10px] font-medium mt-auto">
          <Clock className="w-3 h-3 mr-1" />
          {card.timeAgo}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Business Selector                                                  */
/* ------------------------------------------------------------------ */
function BusinessSelector({
  brands,
  selected,
  onSelect,
}: {
  brands: BrandEntry[];
  selected: BrandEntry | null;
  onSelect: (b: BrandEntry) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-sm">
          {selected ? (
            <>
              {selected.logoUrls?.[selected.selectedLogo ?? 0] ? (
                <img src={selected.logoUrls[selected.selectedLogo ?? 0]} className="h-4 w-4 rounded object-contain" />
              ) : (
                <Building2 className="h-4 w-4 text-primary" />
              )}
              {selected.name}
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4" />
              Select Business
            </>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {brands.length === 0 && (
          <DropdownMenuItem disabled>No businesses yet</DropdownMenuItem>
        )}
        {brands.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => onSelect(b)} className="gap-2">
            {b.logoUrls?.[b.selectedLogo ?? 0] ? (
              <img src={b.logoUrls[b.selectedLogo ?? 0]} className="h-4 w-4 rounded object-contain" />
            ) : (
              <Building2 className="h-4 w-4 text-primary" />
            )}
            {b.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Objective Dialog (inline)                                      */
/* ------------------------------------------------------------------ */
function AddObjectiveInline({ onAdd }: { onAdd: (title: string, desc: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), desc.trim());
    setTitle("");
    setDesc("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/40 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Objective
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full max-w-[340px] flex flex-col gap-2">
      <Input
        placeholder="Objective title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-sm h-8"
        autoFocus
      />
      <Input
        placeholder="Brief description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="text-sm h-8"
      />
      <div className="flex gap-2 mt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={!title.trim()}>
          Add
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main View                                                          */
/* ------------------------------------------------------------------ */
export function ManageDashboardView() {
  const { brands, products, audiences } = useBusinessDNA();
  const [selectedBrand, setSelectedBrand] = useState<BrandEntry | null>(null);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [customObjectives, setCustomObjectives] = useState<{ id: string; title: string; description: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const activeBrand = selectedBrand && brands.find((b) => b.id === selectedBrand.id)
    ? brands.find((b) => b.id === selectedBrand.id)!
    : brands[0] || null;

  const connections = useConnections(activeBrand?.id);

  const cards = useMemo(() => {
    if (!activeBrand) return [];
    switch (activeTab) {
      case "Briefing":
        return buildBriefingCards(activeBrand, products, audiences, connections);
      case "Updates":
        return buildUpdateCards(activeBrand, products, audiences);
      case "To-Dos":
        return buildTodoCards(activeBrand, products, audiences, connections);
      case "Objectives":
        return buildObjectiveCards(activeBrand, products, audiences, connections, customObjectives);
      default:
        return [];
    }
  }, [activeTab, activeBrand, products, audiences, connections, customObjectives]);

  const filteredCards = searchQuery
    ? cards.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cards;

  const handleAddObjective = (title: string, description: string) => {
    setCustomObjectives((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, title, description },
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <BusinessSelector brands={brands} selected={activeBrand} onSelect={setSelectedBrand} />
        </div>

        <div className="relative max-w-[220px]">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-7 pr-2 py-1.5 border border-transparent rounded-md bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background focus:border-border text-[11px] transition-colors"
            placeholder="Search cards..."
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-b border-border">
        <div className="px-6 lg:px-8">
          <nav className="flex gap-8" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors outline-none ${
                    isActive
                      ? "border-transparent text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="manageDashTabIndicator"
                      className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-primary"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <main className="px-6 lg:px-8 py-6">
          {!activeBrand ? (
            <div className="text-muted-foreground w-full py-12 text-center border-2 border-dashed border-border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Select a business to see your dashboard.</p>
            </div>
          ) : (
            <motion.div
              key={`${activeTab}-${activeBrand.id}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-4"
            >
              {filteredCards.map((card) => (
                <DashCard key={card.id} card={card} />
              ))}

              {activeTab === "Objectives" && (
                <AddObjectiveInline onAdd={handleAddObjective} />
              )}

              {filteredCards.length === 0 && searchQuery && (
                <div className="text-muted-foreground w-full py-8 text-center text-sm">
                  No cards match "{searchQuery}"
                </div>
              )}
            </motion.div>
          )}
        </main>
      </ScrollArea>
    </div>
  );
}
