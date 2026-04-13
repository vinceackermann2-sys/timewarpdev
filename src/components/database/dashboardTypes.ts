import {
  Building2, TrendingUp, Users, Plug, Mail, ShoppingBag,
  Palette, Bot, Target, Lightbulb, AlertTriangle, RefreshCw, Award, Image,
} from "lucide-react";

import logoHubspot from "@/assets/logo-hubspot.svg";
import logoOutlook from "@/assets/logo-ms-outlook.svg";
import logoOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoOnenote from "@/assets/logo-ms-onenote.svg";
import logoZoom from "@/assets/logo-zoom.svg";

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
}

export const badgeClasses: Record<string, string> = {
  High: "bg-red-100/60 text-red-600 dark:bg-red-900/40 dark:text-red-300 backdrop-blur-sm border border-red-200/50 dark:border-red-700/30 shadow-sm",
  Medium: "bg-yellow-100/60 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-700/30 shadow-sm",
  Low: "bg-green-100/60 text-green-600 dark:bg-green-900/40 dark:text-green-300 backdrop-blur-sm border border-green-200/50 dark:border-green-700/30 shadow-sm",
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
  };
  return map[card.source || ""] || "View Details";
}
