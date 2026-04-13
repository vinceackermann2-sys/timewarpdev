import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ClipboardCheck,
  RefreshCw,
  ListTodo,
  Award,
  Clock,
  Box,
  FileText,
  MessageSquare,
  Target,
  CheckCircle2,
  User,
  X,
  Building2,
  ChevronDown,
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
  type: "task" | "document" | "email";
  priority: "High" | "Medium" | "Low";
  timeAgo: string;
  title: string;
  actionText: string;
  badgeVariant: "high" | "medium" | "low";
  AppIcon: React.ElementType;
  previewText: string;
  plan?: string[];
  docName?: string;
  sender?: { name: string; initials: string; role: string };
  message?: string;
}

const badgeClasses: Record<string, string> = {
  high: "bg-destructive/80 text-destructive-foreground",
  medium: "bg-[hsl(45,93%,47%)]/80 text-white",
  low: "bg-emerald-500/80 text-white",
};

/* ------------------------------------------------------------------ */
/*  Build cards from brand data                                        */
/* ------------------------------------------------------------------ */
function buildBriefingCards(brand: BrandEntry): DashboardCard[] {
  const cards: DashboardCard[] = [];

  // Brand overview card
  cards.push({
    id: `${brand.id}-overview`,
    type: "task",
    priority: "High",
    timeAgo: brand.lastUpdated || "recently",
    title: `${brand.name} Overview`,
    actionText: "View Details",
    badgeVariant: "high",
    AppIcon: Building2,
    previewText: `${brand.category || "Business"} — review brand status and key metrics.`,
    plan: [
      brand.colors ? "Brand colors configured" : "Set up brand colors",
      brand.typography ? "Typography defined" : "Define typography",
      brand.logoUrls?.length ? `${brand.logoUrls.length} logo(s) uploaded` : "Upload a logo",
    ],
  });

  // Visual identity card
  if (brand.visualIdentity) {
    const vi = brand.visualIdentity;
    const assetCount = (vi.moodboardUrls?.length || 0) + (vi.illustrationUrls?.length || 0);
    cards.push({
      id: `${brand.id}-visual`,
      type: "document",
      priority: assetCount > 0 ? "Low" : "Medium",
      timeAgo: brand.lastUpdated || "recently",
      title: "Visual Identity Status",
      actionText: "Review Assets",
      badgeVariant: assetCount > 0 ? "low" : "medium",
      AppIcon: Box,
      previewText: assetCount > 0
        ? `${assetCount} visual assets generated — moodboards, illustrations, patterns.`
        : "Visual assets are still being generated or need setup.",
      docName: "Visual_Identity_Assets",
      sender: { name: brand.name, initials: brand.name.slice(0, 2).toUpperCase(), role: "Brand" },
    });
  }

  // Safety / agent card
  if (brand.agentName) {
    cards.push({
      id: `${brand.id}-agent`,
      type: "task",
      priority: "Medium",
      timeAgo: brand.lastUpdated || "recently",
      title: `AI Agent: ${brand.agentName}`,
      actionText: "Configure Agent",
      badgeVariant: "medium",
      AppIcon: Target,
      previewText: `Agent "${brand.agentName}" is linked to ${brand.name}. Review safety settings and behaviour.`,
      plan: [
        "Review safety guardrails",
        "Check moderation settings",
        "Test agent responses",
      ],
    });
  }

  return cards;
}

/* ------------------------------------------------------------------ */
/*  Preview Card                                                       */
/* ------------------------------------------------------------------ */
function PreviewCard({ card, onOpenPreview }: { card: DashboardCard; onOpenPreview: (c: DashboardCard) => void }) {
  const Icon = card.AppIcon;
  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full max-w-[340px] flex flex-col transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${badgeClasses[card.badgeVariant]}`}>
            {card.priority} Priority
          </span>
          <div className="flex items-center text-muted-foreground text-xs font-medium">
            <Clock className="w-3.5 h-3.5 mr-1" />
            {card.timeAgo}
          </div>
        </div>
        <div className="bg-muted/60 border border-border/40 p-1 rounded flex items-center justify-center w-7 h-7">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-3">{card.title}</h3>
      <p className="text-xs text-muted-foreground mb-5 line-clamp-2">{card.previewText}</p>
      <button
        onClick={() => onOpenPreview(card)}
        className="mt-auto w-max px-3 py-1.5 text-xs font-medium text-primary-foreground rounded bg-primary hover:bg-primary/90 transition-colors"
      >
        {card.actionText}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail Panel                                                       */
/* ------------------------------------------------------------------ */
function DetailPanel({ card, onClose }: { card: DashboardCard; onClose: () => void }) {
  const Icon = card.AppIcon;
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed top-0 right-0 h-screen w-[400px] bg-card border-l border-border shadow-[-20px_0_40px_rgba(0,0,0,0.08)] z-[100] flex flex-col"
    >
      <ScrollArea className="flex-1">
        <div className="p-8 flex flex-col gap-6 text-foreground">
          <button onClick={onClose} className="self-end p-1 rounded-md hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${badgeClasses[card.badgeVariant]}`}>
                {card.priority}
              </span>
              <span className="text-muted-foreground text-xs flex items-center font-medium">
                <Clock className="w-3 h-3 mr-1" />
                {card.timeAgo}
              </span>
            </div>
            <Icon className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <div className="font-bold text-2xl mb-2">{card.title}</div>
            <p className="text-base text-muted-foreground leading-relaxed">{card.previewText}</p>
          </div>
          {card.type === "email" && card.sender && (
            <div className="bg-muted/40 rounded-xl p-5 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {card.sender.initials}
                </div>
                <div>
                  <div className="text-base font-bold">{card.sender.name}</div>
                  <div className="text-sm text-muted-foreground font-medium">{card.sender.role}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground italic border-l-2 border-primary pl-4 py-2 bg-primary/5">
                {card.message}
              </div>
            </div>
          )}
          {card.type === "document" && (
            <div className="bg-muted/40 rounded-xl p-5 border border-border flex items-start gap-4">
              <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
                <FileText className="w-10 h-10" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-base font-bold mb-1">{card.docName}</div>
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                  <User className="w-4 h-4" /> {card.sender?.name}
                </div>
              </div>
            </div>
          )}
          {card.type === "task" && card.plan && (
            <div className="bg-muted/40 rounded-xl p-5 border border-border">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Action Plan
              </div>
              <ul className="space-y-3">
                {card.plan.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
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
/*  Main View                                                          */
/* ------------------------------------------------------------------ */
export function ManageDashboardView() {
  const { brands } = useBusinessDNA();
  const [selectedBrand, setSelectedBrand] = useState<BrandEntry | null>(null);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [previewCard, setPreviewCard] = useState<DashboardCard | null>(null);

  // Auto-select first brand if none selected
  const activeBrand = selectedBrand && brands.find((b) => b.id === selectedBrand.id)
    ? brands.find((b) => b.id === selectedBrand.id)!
    : brands[0] || null;

  const cards = activeBrand ? buildBriefingCards(activeBrand) : [];

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <BusinessSelector brands={brands} selected={activeBrand} onSelect={setSelectedBrand} />
        </div>

        {/* Search — compact */}
        <div className="relative max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-8 pr-3 py-2 border border-transparent rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background focus:border-border text-xs transition-colors"
            placeholder="Ask me anything..."
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
              <p>Select a business to see your briefing.</p>
            </div>
          ) : (
            <motion.div
              key={`${activeTab}-${activeBrand.id}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-6"
            >
              {activeTab === "Briefing" && cards.map((card) => (
                <PreviewCard key={card.id} card={card} onOpenPreview={setPreviewCard} />
              ))}

              {activeTab !== "Briefing" && (
                <div className="text-muted-foreground w-full py-12 text-center border-2 border-dashed border-border rounded-lg">
                  <p>No {activeTab.toLowerCase()} items yet for {activeBrand.name}.</p>
                </div>
              )}
            </motion.div>
          )}
        </main>
      </ScrollArea>

      {/* Detail slide-over */}
      <AnimatePresence>
        {previewCard && <DetailPanel card={previewCard} onClose={() => setPreviewCard(null)} />}
      </AnimatePresence>
    </div>
  );
}
