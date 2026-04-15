import {
  Building2, TrendingUp, Users, Plug, Mail, ShoppingBag,
  Palette, Bot, Target, Lightbulb, AlertTriangle, RefreshCw, Award, Image,
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
  };
  return map[card.source || ""] || "View Details";
}
