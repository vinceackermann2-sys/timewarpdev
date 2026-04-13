import { useState, useRef } from "react";
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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const TABS = [
  { id: "Briefing", label: "Briefing", icon: ClipboardCheck },
  { id: "Updates", label: "Updates", icon: RefreshCw },
  { id: "To-Dos", label: "To-Dos", icon: ListTodo },
  { id: "Objectives", label: "Objectives", icon: Award },
];

interface CardSender {
  name: string;
  initials: string;
  role: string;
}

interface DashboardCard {
  id: number;
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
  sender?: CardSender;
  message?: string;
}

const TAB_DATA: Record<string, DashboardCard[]> = {
  Briefing: [
    {
      id: 1, type: "task", priority: "High", timeAgo: "2h ago", title: "Blocker Identified",
      actionText: "Approve Targeting", badgeVariant: "high", AppIcon: Box,
      previewText: "Targeting settings need approval for the Q3 campaign launch.",
      plan: ["Review audience demographics", "Check budget allocation", "Approve in Ad Manager"],
    },
    {
      id: 2, type: "document", priority: "Medium", timeAgo: "4h ago", title: "Weekly Sync Notes",
      actionText: "Read Summary", badgeVariant: "medium", AppIcon: FileText,
      previewText: "Discussion around new UI components and timeline adjustments.",
      docName: "Q3_Sync_Notes_v2.pdf", sender: { name: "Sarah Chen", initials: "SC", role: "Product Manager" },
    },
  ],
  Updates: [
    {
      id: 3, type: "document", priority: "Low", timeAgo: "1h ago", title: "Design System v2.1",
      actionText: "View Changelog", badgeVariant: "low", AppIcon: Box,
      previewText: "Added new button variants and updated color tokens.",
      docName: "Figma_Tokens_Export.json", sender: { name: "Design Team", initials: "DT", role: "UX/UI" },
    },
    {
      id: 4, type: "email", priority: "Medium", timeAgo: "3h ago", title: "Client Feedback Received",
      actionText: "Reply to Client", badgeVariant: "medium", AppIcon: MessageSquare,
      previewText: "Client requested changes to the homepage hero section.",
      sender: { name: "Acme Corp", initials: "AC", role: "Enterprise Client" },
      message: '"The new hero section looks great, but could we increase the logo size by 20% and adjust the CTA button to match our brand guidelines?"',
    },
  ],
  "To-Dos": [
    {
      id: 5, type: "task", priority: "High", timeAgo: "10m ago", title: "Finalize Q3 Budget",
      actionText: "Start Review", badgeVariant: "high", AppIcon: FileText,
      previewText: "Review and approve the finalized budget allocations for Q3.",
      plan: ["Verify marketing spend", "Confirm contractor hours", "Sign off via portal"],
    },
    {
      id: 6, type: "document", priority: "High", timeAgo: "1d ago", title: "Approve Marketing Assets",
      actionText: "Review Assets", badgeVariant: "high", AppIcon: Box,
      previewText: "Check the new banner designs and social media graphics.",
      docName: "Social_Campaign_Assets.zip", sender: { name: "Marketing", initials: "MK", role: "Creative Team" },
    },
  ],
  Objectives: [
    {
      id: 7, type: "task", priority: "Medium", timeAgo: "2d ago", title: "Increase User Retention by 15%",
      actionText: "Update Progress", badgeVariant: "medium", AppIcon: Target,
      previewText: "Current progress is at 8%. Need to push new engagement features.",
      plan: ["Analyze drop-off points", "A/B test onboarding flow", "Deploy push notification campaign"],
    },
  ],
};

const badgeClasses: Record<string, string> = {
  high: "bg-destructive/80 text-destructive-foreground",
  medium: "bg-[hsl(45,93%,47%)]/80 text-white",
  low: "bg-emerald-500/80 text-white",
};

/* ------------------------------------------------------------------ */
/*  Preview Card                                                       */
/* ------------------------------------------------------------------ */
function PreviewCard({ card, onOpenPreview }: { card: DashboardCard; onOpenPreview: (c: DashboardCard) => void }) {
  const Icon = card.AppIcon;

  return (
    <div className="bg-card border border-border rounded-xl p-4 w-full max-w-[340px] flex flex-col transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      {/* Header row */}
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

      {/* Skeleton placeholder lines */}
      <div className="space-y-2 mb-5 opacity-40">
        <div className="h-1.5 bg-muted-foreground/30 rounded-full w-full" />
        <div className="h-1.5 bg-muted-foreground/30 rounded-full w-2/3" />
      </div>

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
/*  Side Panel (slide-over)                                            */
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
          {/* Close */}
          <button onClick={onClose} className="self-end p-1 rounded-md hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Header */}
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

          {/* Title & Description */}
          <div>
            <div className="font-bold text-2xl mb-2">{card.title}</div>
            <p className="text-base text-muted-foreground leading-relaxed">{card.previewText}</p>
          </div>

          {/* Email context */}
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

          {/* Document context */}
          {card.type === "document" && (
            <div className="bg-muted/40 rounded-xl p-5 border border-border flex items-start gap-4">
              <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
                <FileText className="w-10 h-10" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-base font-bold mb-1">{card.docName}</div>
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Shared by {card.sender?.name}
                </div>
              </div>
            </div>
          )}

          {/* Task plan */}
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
/*  Main View                                                          */
/* ------------------------------------------------------------------ */
export function ManageDashboardView() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [previewCard, setPreviewCard] = useState<DashboardCard | null>(null);

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-8 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Your Dashboard</h1>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-transparent rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background focus:border-border text-sm transition-colors"
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
                  className={`group relative flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors outline-none ${
                    isActive
                      ? "border-transparent text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
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

      {/* Sub bar */}
      <div className="border-b border-border">
        <div className="px-6 lg:px-8 py-3 flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Sort by:</span>
          <span className="font-semibold">Priority</span>
          <div className="flex gap-2">
            {["High", "Medium", "Low"].map((level) => (
              <button
                key={level}
                className="bg-card border border-border text-foreground px-3 py-1 rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <main className="px-6 lg:px-8 py-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap gap-6"
          >
            {TAB_DATA[activeTab]?.map((card) => (
              <PreviewCard key={card.id} card={card} onOpenPreview={setPreviewCard} />
            ))}

            {(!TAB_DATA[activeTab] || TAB_DATA[activeTab].length === 0) && (
              <div className="text-muted-foreground w-full py-12 text-center border-2 border-dashed border-border rounded-lg">
                <p>No items found for {activeTab}.</p>
              </div>
            )}
          </motion.div>
        </main>
      </ScrollArea>

      {/* Detail slide-over */}
      <AnimatePresence>
        {previewCard && <DetailPanel card={previewCard} onClose={() => setPreviewCard(null)} />}
      </AnimatePresence>
    </div>
  );
}
