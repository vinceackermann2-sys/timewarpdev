/**
 * OnboardingEnrichmentInputs — pre-forge step where the user can:
 *   1. Upload internal documents (pitch deck, financials, strategy, anything)
 *   2. Connect integrations (Gmail, Drive, HubSpot, Slack, Stripe, …)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Loader2, Plug, Upload, Sparkles, RefreshCw, FileText,
  ExternalLink, Unplug
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";
import { FileUploadZone } from "@/components/database/FileUploadZone";
import { toast } from "sonner";

import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoMsOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoMsOnenote from "@/assets/logo-ms-onenote.svg";
import logoMsTeams from "@/assets/logo-ms-teams.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoHubspot from "@/assets/logo-hubspot.svg";
import logoGoogleDrive from "@/assets/logo-google-drive.svg";
import logoGmail from "@/assets/logo-gmail.svg";
import logoStripe from "@/assets/logo-stripe.svg";
import logoZoom from "@/assets/logo-zoom.svg";
import logoGoogleCalendar from "@/assets/logo-google-calendar.svg";
import logoGoogleDocs from "@/assets/logo-google-docs.svg";
import logoGoogleSheets from "@/assets/logo-google-sheets.svg";
import logoGoogleSlides from "@/assets/logo-google-slides.svg";

interface ProviderRow {
  id: string;
  name: string;
  description: string;
  logo: string;
  iconBg?: string;
  group: "Microsoft" | "Google" | "Business";
  pillars?: string;
}

const PROVIDERS: ProviderRow[] = [
  { id: "microsoft_onedrive", name: "OneDrive", description: "Files & docs", logo: logoMsOnedrive, group: "Microsoft", pillars: "Operations · Strategy" },
  { id: "microsoft_onenote", name: "OneNote", description: "Notes & SOPs", logo: logoMsOnenote, group: "Microsoft", pillars: "Operations" },
  { id: "microsoft_teams", name: "Teams", description: "Team channels", logo: logoMsTeams, group: "Microsoft", pillars: "People · Operations" },
  { id: "microsoft_outlook", name: "Outlook", description: "Email, calendar, contacts", logo: logoMsOutlook, group: "Microsoft", pillars: "People · Audience" },
  { id: "google_gmail", name: "Gmail", description: "Email + contacts", logo: logoGmail, group: "Google", pillars: "People · Audience" },
  { id: "google_drive", name: "Google Drive", description: "Files & docs", logo: logoGoogleDrive, group: "Google", pillars: "Operations · Strategy" },
  { id: "google_docs", name: "Google Docs", description: "Documents", logo: logoGoogleDocs, group: "Google", pillars: "Operations · Strategy" },
  { id: "google_sheets", name: "Google Sheets", description: "Spreadsheets", logo: logoGoogleSheets, group: "Google", pillars: "Financial · Operations" },
  { id: "google_slides", name: "Google Slides", description: "Presentations", logo: logoGoogleSlides, group: "Google", pillars: "Strategy" },
  { id: "google_calendar", name: "Google Calendar", description: "Meetings & cadence", logo: logoGoogleCalendar, group: "Google", pillars: "People · Operations" },
  { id: "hubspot", name: "HubSpot", description: "CRM & pipeline", logo: logoHubspot, iconBg: "bg-orange-100", group: "Business", pillars: "Growth · Audience · People" },
  { id: "stripe", name: "Stripe", description: "Revenue & customers", logo: logoStripe, group: "Business", pillars: "Financial · Product" },
  { id: "slack", name: "Slack", description: "Team messages", logo: logoSlack, group: "Business", pillars: "People · Operations" },
  { id: "zoom", name: "Zoom", description: "Meetings & recordings", logo: logoZoom, iconBg: "bg-blue-500", group: "Business", pillars: "People" },
];

interface UploadedFileMeta {
  id: string;
  fileName: string;
  mimeType: string;
}

interface OnboardingEnrichmentInputsProps {
  onContinue: (summary: { fileCount: number; integrationCount: number }) => void;
  onSkip: () => void;
}

export function OnboardingEnrichmentInputs({ onContinue, onSkip }: OnboardingEnrichmentInputsProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [tab, setTab] = useState<"files" | "integrations">("files");
  const [uploaded, setUploaded] = useState<UploadedFileMeta[]>([]);
  const [connected, setConnected] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const checkConnections = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "check-status", workspaceId: activeWorkspaceId ?? null }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setConnected((data.connected || []).map((c: any) => c.provider));
      }
    } catch {
      /* best effort */
    } finally {
      setRefreshing(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => { checkConnections(); }, [checkConnections]);

  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) checkConnections(); };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "oauth_connection_completed") checkConnections();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("message", onMessage);
    };
  }, [checkConnections]);

  const handleConnect = useCallback(async (providerId: string) => {
    setConnectingId(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            provider: providerId,
            action: "get-auth-url",
            returnPath: "/app/assistant",
            origin: window.location.origin,
            workspaceId: activeWorkspaceId ?? null,
          }),
        },
      );
      const data = await res.json();
      if (data.authUrl) {
        window.open(data.authUrl, "_blank");
      }
    } catch {
      /* best effort */
    } finally {
      setConnectingId(null);
    }
  }, [activeWorkspaceId]);

  const handleDisconnect = useCallback(async (providerId: string) => {
    setConnectingId(providerId); // Reuse connecting ID for spinner
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider: providerId, action: "disconnect", workspaceId: activeWorkspaceId ?? null }),
        }
      );

      if (response.ok) {
        setConnected(prev => prev.filter(p => p !== providerId));
        const label = PROVIDERS.find(i => i.id === providerId)?.name || providerId;
        toast.success(`${label} disconnected`);
      }
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setConnectingId(null);
    }
  }, [activeWorkspaceId]);

  const summary = useMemo(
    () => ({ fileCount: uploaded.length, integrationCount: connected.length }),
    [uploaded.length, connected.length],
  );
  const providersByGroup = useMemo(() => ({
    Microsoft: PROVIDERS.filter((p) => p.group === "Microsoft"),
    Google: PROVIDERS.filter((p) => p.group === "Google"),
    Business: PROVIDERS.filter((p) => p.group === "Business"),
  }), []);

  return (
    <div className="rounded-3xl border border-border/40 bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-7 py-6 border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-transparent flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-sm">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-foreground tracking-tight">Connect Data Sources</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-7 pt-6">
        <div className="inline-flex items-center p-1.5 rounded-xl bg-muted/50 border border-border/40 backdrop-blur-sm shadow-sm">
          <button
            onClick={() => setTab("files")}
            className={cn(
              "px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
              tab === "files" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Upload className="w-4 h-4" />
            Upload files
            {uploaded.length > 0 && <Badge>{uploaded.length}</Badge>}
          </button>
          <button
            onClick={() => setTab("integrations")}
            className={cn(
              "px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
              tab === "integrations" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Plug className="w-4 h-4" />
            Connect tools
            {connected.length > 0 && <Badge>{connected.length}</Badge>}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-7 pt-5 pb-6">
        <AnimatePresence mode="wait">
          {tab === "files" ? (
            <motion.div
              key="files"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <FileUploadZone
                onFileUploaded={(file) => {
                  setUploaded((prev) => [
                    ...prev,
                    { id: file.id, fileName: file.fileName, mimeType: file.mimeType },
                  ]);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-end mb-3">
                <button
                  onClick={checkConnections}
                  disabled={refreshing}
                  className="text-[13px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                  Refresh
                </button>
              </div>
              <div className="space-y-4">
                {(Object.keys(providersByGroup) as Array<keyof typeof providersByGroup>).map((group) => (
                  <div key={group}>
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {providersByGroup[group].map((p) => {
                        const isConnected = connected.includes(p.id);
                        const isConnecting = connectingId === p.id;
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              "flex items-center gap-3 p-3.5 rounded-2xl border transition-all shadow-sm",
                              isConnected
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-border/60 hover:border-primary/40 hover:bg-muted/40",
                              isConnecting && "opacity-70"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0",
                              p.iconBg || "bg-card border border-border/60",
                            )}>
                              <img src={p.logo} alt={p.name} className="w-5 h-5 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-bold text-foreground truncate">{p.name}</p>
                              <p className="text-[12px] text-muted-foreground truncate mt-0.5">{p.description}</p>
                              {p.pillars && (
                                <p className="text-[11px] text-primary/80 font-medium mt-1.5 truncate">→ {p.pillars}</p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center">
                              {isConnecting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary mx-2" />
                              ) : isConnected ? (
                                <div className="flex flex-col items-end gap-1.5">
                                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" /> Connected
                                  </span>
                                  <button
                                    onClick={() => handleDisconnect(p.id)}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-destructive/70 hover:text-destructive transition-colors mr-1"
                                  >
                                    <Unplug className="w-3 h-3" /> Disconnect
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleConnect(p.id)}
                                  className="w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors ml-1"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uploaded files mini-list */}
        {uploaded.length > 0 && tab === "files" && (
          <div className="mt-4 space-y-1.5 bg-muted/30 rounded-xl p-3 border border-border/40">
            {uploaded.slice(-4).map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-[13px] text-muted-foreground font-medium">
                <FileText className="w-4 h-4 text-primary/70" />
                <span className="truncate flex-1">{f.fileName}</span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
            ))}
            {uploaded.length > 4 && (
              <p className="text-[12px] text-muted-foreground italic font-medium pl-6">+{uploaded.length - 4} more</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-7 py-4 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground leading-snug max-w-[60%]">
          {summary.fileCount + summary.integrationCount === 0
            ? "No integrations connected."
            : `${summary.fileCount > 0 ? `${summary.fileCount} file${summary.fileCount === 1 ? "" : "s"}` : ""}${summary.fileCount > 0 && summary.integrationCount > 0 ? " · " : ""}${summary.integrationCount > 0 ? `${summary.integrationCount} integration${summary.integrationCount === 1 ? "" : "s"}` : ""}`}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSkip}
            className="text-[14px] font-semibold text-muted-foreground hover:text-foreground px-4 py-2.5 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => onContinue(summary)}
            className="bg-primary hover:bg-primary/90 text-white text-[15px] font-semibold px-6 py-2.5 rounded-2xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          >
            {summary.fileCount + summary.integrationCount > 0
              ? "Forge DNA"
              : "Forge anyway"}
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 px-1.5 min-w-[20px] h-[20px] rounded-full bg-primary/15 text-primary text-[11px] font-bold inline-flex items-center justify-center">
      {children}
    </span>
  );
}
