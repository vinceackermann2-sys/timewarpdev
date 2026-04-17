import {
  Building2, TrendingUp, Users, Plug, Mail, ShoppingBag,
  Palette, Bot, Target, Lightbulb, AlertTriangle, RefreshCw, Award, Image,
  ClipboardCheck, ListTodo, Send, Play, Compass, Eye,
} from "lucide-react";

import logoHubspot from "@/assets/logo-hubspot.svg";
import logoOutlook from "@/assets/logo-ms-outlook.svg";
import logoOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoOnenote from "@/assets/logo-ms-onenote.svg";
import logoZoom from "@/assets/logo-zoom.svg";
import logoTeams from "@/assets/logo-ms-teams.svg";

export interface DashboardCardMetadata {
  senderName?: string;
  senderEmail?: string;
  subject?: string;
  attendees?: string[];
  scheduledDate?: string;
  duration?: string;
  contactName?: string;
  dealValue?: string;
  stage?: string;
  channel?: string;
  author?: string;
  fileName?: string;
  sharedBy?: string;
  notebook?: string;
}

export interface SuccessMetric {
  current: string;
  target: string;
  gap: string;
  source?: string;
}

export interface DashboardCard {
  id: string;
  priority: "High" | "Medium" | "Low";
  title: string;
  description: string;
  detail?: string;
  category?: string;
  source?: string;
  icon?: string;
  timeAgo?: string;
  actionSuggestion?: string;
  metadata?: DashboardCardMetadata;

  // Briefing-specific
  signalType?: string;

  // Updates-specific
  waitingParty?: string;
  requestType?: string;
  waitDuration?: string;
  consequence?: string;

  // To-Dos-specific
  taskType?: string;
  howTo?: string;
  estimatedDuration?: string;
  leverageScore?: number;
  completed?: boolean;

  // Objectives-specific
  objectiveType?: string;
  successMetric?: SuccessMetric;
  progress?: number;
  timeHorizon?: string;
  relatedTodoIds?: string[];
}

export const badgeClasses: Record<string, string> = {
  High: "bg-[linear-gradient(180deg,hsl(0_100%_100%_/_0.78),hsl(0_100%_98%_/_0.56))] text-[hsl(0_68%_42%)] border border-[hsl(0_75%_74%_/_0.95)] shadow-[0_10px_24px_hsl(0_55%_70%_/_0.16),inset_0_1px_0_hsl(0_0%_100%_/_0.92),inset_0_-1px_0_hsl(0_80%_88%_/_0.55)] supports-[backdrop-filter]:bg-[linear-gradient(180deg,hsl(0_100%_100%_/_0.56),hsl(0_100%_98%_/_0.34))] supports-[backdrop-filter]:backdrop-blur-md",
  Medium: "bg-[linear-gradient(180deg,hsl(0_100%_100%_/_0.78),hsl(42_100%_95%_/_0.58))] text-[hsl(37_84%_36%)] border border-[hsl(42_88%_74%_/_0.95)] shadow-[0_10px_24px_hsl(42_70%_68%_/_0.18),inset_0_1px_0_hsl(0_0%_100%_/_0.92),inset_0_-1px_0_hsl(42_100%_86%_/_0.52)] supports-[backdrop-filter]:bg-[linear-gradient(180deg,hsl(0_100%_100%_/_0.56),hsl(42_100%_95%_/_0.34))] supports-[backdrop-filter]:backdrop-blur-md",
  Low: "bg-[linear-gradient(180deg,hsl(0_100%_100%_/_0.78),hsl(142_55%_95%_/_0.58))] text-[hsl(142_62%_30%)] border border-[hsl(142_42%_72%_/_0.95)] shadow-[0_10px_24px_hsl(142_38%_62%_/_0.16),inset_0_1px_0_hsl(0_0%_100%_/_0.92),inset_0_-1px_0_hsl(142_52%_84%_/_0.52)] supports-[backdrop-filter]:bg-[linear-gradient(180deg,hsl(0_100%_100%_/_0.56),hsl(142_55%_95%_/_0.34))] supports-[backdrop-filter]:backdrop-blur-md",
};

export const ICON_MAP: Record<string, React.ElementType> = {
  building: Building2,
  "trending-up": TrendingUp,
  users: Users,
  plug: Plug,
  mail: Mail,
  "shopping-bag": ShoppingBag,
  palette: Palette,
  bot: Bot,
  target: Target,
  lightbulb: Lightbulb,
  alert: AlertTriangle,
  "refresh-cw": RefreshCw,
  award: Award,
  image: Image,
};

export const SOURCE_META: Record<string, { label: string; icon: string }> = {
  hubspot: { label: "HubSpot", icon: logoHubspot },
  slack: { label: "Slack", icon: "https://cdn.simpleicons.org/slack" },
  outlook: { label: "Outlook", icon: logoOutlook },
  onedrive: { label: "OneDrive", icon: logoOnedrive },
  onenote: { label: "OneNote", icon: logoOnenote },
  zoom: { label: "Zoom", icon: logoZoom },
  teams: { label: "Teams", icon: logoTeams },
  "business-dna": { label: "Business DNA", icon: "" },
  products: { label: "Products", icon: "" },
  audiences: { label: "Audiences", icon: "" },
  employees: { label: "AI Employees", icon: "" },
  general: { label: "General", icon: "" },
};

export function getCardButtonLabel(card: DashboardCard): string {
  const map: Record<string, string> = {
    outlook: "View Email",
    zoom: "View Meeting",
    hubspot: "View Deal",
    slack: "View Message",
    onedrive: "View File",
    onenote: "View Note",
    teams: "View Message",
  };
  return map[card.source || ""] || "View Details";
}

export const TAB_SUBTITLES: Record<string, string> = {
  Briefing: "What Has Changed That You Need to Understand",
  Updates: "Who or What Is Blocked Waiting on You",
  "To-Dos": "Where Your Time Should Go Right Now",
  Objectives: "What Strategic Outcomes Must You Drive This Quarter",
};

/* ── Per-tab framing: shared visual language for cards + detail panel ── */
export type TabKind = "Briefing" | "Updates" | "To-Dos" | "Objectives";

export function inferTabKind(card: DashboardCard): TabKind {
  if (card.waitingParty || card.waitDuration || card.consequence) return "Updates";
  if (card.howTo || card.estimatedDuration || card.taskType || typeof card.leverageScore === "number") return "To-Dos";
  if (card.successMetric || typeof card.progress === "number" || card.timeHorizon || card.objectiveType) return "Objectives";
  return "Briefing";
}

export interface TabFraming {
  eyebrow: string;          // short eyebrow chip (card)
  eyebrowFull: string;      // longer eyebrow (panel)
  intent: string;
  icon: React.ElementType;
  accentBar: string;        // background class for 3px rail / 1px bar
  accentChip: string;       // chip background for eyebrow
  accentText: string;       // text accent color class
  accentSoftBg: string;     // soft tint background for hero blocks
  ctaLabel: string;
  ctaIcon: React.ElementType;
  ctaVariant: "default" | "destructive" | "outline";
  summaryLabel: string;
  emptyTitle: string;
  emptyBody: string;
  emptyIcon: React.ElementType;
}

export const TAB_FRAMING: Record<TabKind, TabFraming> = {
  Briefing: {
    eyebrow: "Signal",
    eyebrowFull: "Briefing · What changed",
    intent: "Read this to stay informed. No immediate action needed.",
    icon: ClipboardCheck,
    accentBar: "bg-[hsl(217_100%_65%)]",
    accentChip: "bg-[hsl(217_100%_96%)] text-[hsl(217_70%_42%)] border border-[hsl(217_80%_88%)]",
    accentText: "text-[hsl(217_70%_42%)]",
    accentSoftBg: "bg-[hsl(217_100%_97%)] border-[hsl(217_80%_90%)]",
    ctaLabel: "Discuss in Assistant",
    ctaIcon: Eye,
    ctaVariant: "outline",
    summaryLabel: "Why it matters",
    emptyTitle: "All quiet — no new signals",
    emptyBody: "Your business hasn't surfaced anything new worth your attention right now.",
    emptyIcon: ClipboardCheck,
  },
  Updates: {
    eyebrow: "Waiting",
    eyebrowFull: "Update · Someone is waiting",
    intent: "Respond to unblock the person or process waiting on you.",
    icon: RefreshCw,
    accentBar: "bg-[hsl(0_75%_60%)]",
    accentChip: "bg-[hsl(0_100%_97%)] text-[hsl(0_68%_42%)] border border-[hsl(0_75%_84%)]",
    accentText: "text-[hsl(0_68%_42%)]",
    accentSoftBg: "bg-[hsl(0_100%_98%)] border-[hsl(0_75%_88%)]",
    ctaLabel: "Respond now",
    ctaIcon: Send,
    ctaVariant: "destructive",
    summaryLabel: "Recommended response",
    emptyTitle: "Inbox zero — nobody waiting",
    emptyBody: "Nothing is blocked on your response. Use this time for deep work.",
    emptyIcon: RefreshCw,
  },
  "To-Dos": {
    eyebrow: "Task",
    eyebrowFull: "To-Do · Action required",
    intent: "Complete this task to move work forward.",
    icon: ListTodo,
    accentBar: "bg-primary",
    accentChip: "bg-primary/10 text-primary border border-primary/30",
    accentText: "text-primary",
    accentSoftBg: "bg-primary/5 border-primary/20",
    ctaLabel: "Start task",
    ctaIcon: Play,
    ctaVariant: "default",
    summaryLabel: "Recommended approach",
    emptyTitle: "No tasks queued",
    emptyBody: "You're caught up. New high-leverage tasks will surface here as they emerge.",
    emptyIcon: ListTodo,
  },
  Objectives: {
    eyebrow: "Objective",
    eyebrowFull: "Objective · Strategic outcome",
    intent: "Drive measurable progress toward this quarter's goal.",
    icon: Award,
    accentBar: "bg-[hsl(142_62%_45%)]",
    accentChip: "bg-[hsl(142_55%_95%)] text-[hsl(142_62%_30%)] border border-[hsl(142_42%_78%)]",
    accentText: "text-[hsl(142_62%_30%)]",
    accentSoftBg: "bg-[hsl(142_55%_96%)] border-[hsl(142_42%_82%)]",
    ctaLabel: "Plan execution",
    ctaIcon: Compass,
    ctaVariant: "default",
    summaryLabel: "Strategic rationale",
    emptyTitle: "Define your strategic outcomes",
    emptyBody: "Add objectives to focus your quarter on what truly moves the business.",
    emptyIcon: Award,
  },
};

/** Wait-duration escalation color classes */
export function getWaitEscalationColor(waitDuration?: string): string {
  if (!waitDuration) return "";
  const lower = waitDuration.toLowerCase();
  if (lower.includes("week") || lower.includes("7d") || lower.includes(">7")) return "text-[hsl(0_68%_42%)] bg-[hsl(0_100%_96%)] border-[hsl(0_75%_74%)]";
  if (lower.includes("3d") || lower.includes("4d") || lower.includes("5d") || lower.includes("6d") || lower.includes("3-7")) return "text-[hsl(0_68%_42%)] bg-[hsl(0_100%_97%)] border-[hsl(0_60%_80%)]";
  if (lower.includes("1d") || lower.includes("2d") || lower.includes("1-3") || lower.includes("day")) return "text-[hsl(37_84%_36%)] bg-[hsl(42_100%_96%)] border-[hsl(42_88%_74%)]";
  if (lower.includes("hour") || lower.includes("8-24") || lower.includes("h")) return "text-[hsl(37_84%_36%)] bg-[hsl(42_100%_97%)] border-[hsl(42_80%_80%)]";
  return "text-muted-foreground bg-muted border-border";
}

/** Estimated duration emoji */
export function getDurationEmoji(estimatedDuration?: string): string {
  if (!estimatedDuration) return "🕐";
  const lower = estimatedDuration.toLowerCase();
  if (lower.includes("quick") || lower.includes("5 min") || lower.includes("10 min") || lower.includes("15 min")) return "⚡";
  if (lower.includes("deep") || lower.includes("2 hour") || lower.includes("3 hour") || lower.includes("half day") || lower.includes("full day")) return "💎";
  return "🕐";
}
