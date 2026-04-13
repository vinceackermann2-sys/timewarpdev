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
  High: "bg-[hsl(0_100%_97%_/_0.86)] text-[hsl(0_72%_42%)] border border-[hsl(0_65%_82%_/_0.95)] backdrop-blur-xl shadow-[0_6px_18px_hsl(0_0%_0%_/_0.08),inset_0_1px_0_hsl(0_0%_100%_/_0.72)]",
  Medium: "bg-[hsl(42_100%_96%_/_0.9)] text-[hsl(36_82%_36%)] border border-[hsl(42_88%_78%_/_0.95)] backdrop-blur-xl shadow-[0_6px_18px_hsl(0_0%_0%_/_0.08),inset_0_1px_0_hsl(0_0%_100%_/_0.72)]",
  Low: "bg-[hsl(142_55%_96%_/_0.88)] text-[hsl(142_62%_30%)] border border-[hsl(142_42%_78%_/_0.95)] backdrop-blur-xl shadow-[0_6px_18px_hsl(0_0%_0%_/_0.08),inset_0_1px_0_hsl(0_0%_100%_/_0.72)]",
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
