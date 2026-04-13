import {
  Building2, TrendingUp, Users, Plug, Mail, ShoppingBag,
  Palette, Bot, Target, Lightbulb, AlertTriangle, RefreshCw, Award, Image,
} from "lucide-react";

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
}

export const badgeClasses: Record<string, string> = {
  High: "bg-destructive/80 text-destructive-foreground",
  Medium: "bg-[hsl(45,93%,47%)]/80 text-white",
  Low: "bg-emerald-500/80 text-white",
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
  hubspot: { label: "HubSpot", icon: "/src/assets/logo-hubspot.svg" },
  slack: { label: "Slack", icon: "https://cdn.simpleicons.org/slack" },
  outlook: { label: "Outlook", icon: "/src/assets/logo-ms-outlook.svg" },
  onedrive: { label: "OneDrive", icon: "/src/assets/logo-ms-onedrive.svg" },
  onenote: { label: "OneNote", icon: "/src/assets/logo-ms-onenote.svg" },
  zoom: { label: "Zoom", icon: "/src/assets/logo-zoom.svg" },
  "business-dna": { label: "Business DNA", icon: "" },
  products: { label: "Products", icon: "" },
  audiences: { label: "Audiences", icon: "" },
  employees: { label: "AI Employees", icon: "" },
  general: { label: "General", icon: "" },
};
