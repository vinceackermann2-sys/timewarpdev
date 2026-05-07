/**
 * OnboardingEnrichmentInputs — pre-forge step where the user can:
 *   1. Upload internal documents (pitch deck, financials, strategy, anything)
 *   2. Connect integrations (Gmail, Drive, HubSpot, Slack, Stripe, …)
 *
 * Both are optional — the user can hit "Forge with what we have" at any time.
 *
 * Why pre-forge instead of post-forge ("supercharge"): the spec says every
 * field of the DNA must be data-backed, with INTERNAL data (uploaded files
 * + connected integrations) winning over external when they conflict.  We
 * can only enforce that if the data is available BEFORE enrichment runs.
 *
 * OAuth opens in a new tab on purpose — the onboarding tab keeps its state
 * intact, and the user comes back, hits "Refresh" or just continues.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Loader2, Plug, Upload, Sparkles, RefreshCw, FileText,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";
import { FileUploadZone } from "@/components/database/FileUploadZone";

import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoHubspot from "@/assets/logo-hubspot.svg";
import logoGoogleDrive from "@/assets/logo-google-drive.svg";
import logoGmail from "@/assets/logo-gmail.svg";
import logoStripe from "@/assets/logo-stripe.svg";
import logoZoom from "@/assets/logo-zoom.svg";
import logoGoogleCalendar from "@/assets/logo-google-calendar.svg";

interface ProviderRow {
  id: string;
  name: string;
  description: string;
  logo: string;
  iconBg?: string;
}

/** Keep the picker tight — the rest live in /app/connections post-onboarding. */
const PROVIDERS: ProviderRow[] = [
  { id: "google_gmail", name: "Gmail", description: "Email + contacts", logo: logoGmail },
  { id: "google_drive", name: "Google Drive", description: "Files & docs", logo: logoGoogleDrive },
  { id: "google_calendar", name: "Calendar", description: "Meetings & cadence", logo: logoGoogleCalendar },
  { id: "microsoft_outlook", name: "Outlook", description: "Email & calendar", logo: logoMsOutlook },
  { id: "hubspot", name: "HubSpot", description: "CRM & pipeline", logo: logoHubspot, iconBg: "bg-orange-100" },
  { id: "stripe", name: "Stripe", description: "Revenue & customers", logo: logoStripe },
  { id: "slack", name: "Slack", description: "Team messages", logo: logoSlack },
  { id: "zoom", name: "Zoom", description: "Meetings & recordings", logo: logoZoom, iconBg: "bg-blue-500" },
];

interface UploadedFileMeta {
  id: string;
  fileName: string;
  mimeType: string;
}

interface OnboardingEnrichmentInputsProps {
  /** Continue to forging — receives counts so the next step can show them. */
  onContinue: (summary: { fileCount: number; integrationCount: number }) => void;
  /** Skip both — go straight to forging with website-only data. */
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

  // Refresh whenever the tab regains focus (user came back from OAuth tab)
  // OR the OAuth popup posts back its success message.
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
            // Coming back to /app routes us through AppShell which handles
            // the oauth_success param.  The current onboarding tab stays
            // intact because we open the OAuth flow in a new tab.
            returnPath: "/app/assistant",
            origin: window.location.origin,
            workspaceId: activeWorkspaceId ?? null,
          }),
        },
      );
      const data = await res.json();
      if (data.authUrl) {
        // New tab so onboarding state isn't lost. Keep window.opener so the
        // OAuth-return tab can postMessage back and self-close (see AppShell).
        window.open(data.authUrl, "_blank");
      }
    } catch {
      /* best effort */
    } finally {
      setConnectingId(null);
    }
  }, [activeWorkspaceId]);

  const summary = useMemo(
    () => ({ fileCount: uploaded.length, integrationCount: connected.length }),
    [uploaded.length, connected.length],
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground">
            Feed me your data so the DNA isn't guesswork
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Upload internal docs and/or connect integrations — anything you give me beats public data.  Skip if you'd rather start fast.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-4">
        <div className="inline-flex items-center p-1 rounded-lg bg-muted border border-border/60">
          <button
            onClick={() => setTab("files")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5",
              tab === "files" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload files
            {uploaded.length > 0 && <Badge>{uploaded.length}</Badge>}
          </button>
          <button
            onClick={() => setTab("integrations")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5",
              tab === "integrations" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Plug className="w-3.5 h-3.5" />
            Connect tools
            {connected.length > 0 && <Badge>{connected.length}</Badge>}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5 pt-4 pb-5">
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
              <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">
                <strong className="text-foreground/80">Best inputs:</strong> pitch deck, financials, strategy doc, brand guidelines, customer interviews, product specs, P&amp;L, customer list.  Files become the highest-priority source — they override anything I find online.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] text-muted-foreground">
                  Opens in a new tab — your place here is saved.
                </p>
                <button
                  onClick={checkConnections}
                  disabled={refreshing}
                  className="text-[12px] text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROVIDERS.map((p) => {
                  const isConnected = connected.includes(p.id);
                  const isConnecting = connectingId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isConnected && handleConnect(p.id)}
                      disabled={isConnected || isConnecting}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                        isConnected
                          ? "border-emerald-500/30 bg-emerald-500/5 cursor-default"
                          : "border-border hover:border-primary/40 hover:bg-muted/40",
                        isConnecting && "opacity-70 cursor-wait",
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0",
                        p.iconBg || "bg-card border border-border/60",
                      )}>
                        <img src={p.logo} alt={p.name} className="w-5 h-5 object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                      </div>
                      {isConnected ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 shrink-0">
                          <Check className="w-3.5 h-3.5" /> Connected
                        </span>
                      ) : isConnecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">
                You can connect more later from <span className="font-medium text-foreground">Connectors</span> in the sidebar.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uploaded files mini-list */}
        {uploaded.length > 0 && tab === "files" && (
          <div className="mt-3 space-y-1">
            {uploaded.slice(-4).map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <FileText className="w-3.5 h-3.5 text-primary/70" />
                <span className="truncate flex-1">{f.fileName}</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            ))}
            {uploaded.length > 4 && (
              <p className="text-[11px] text-muted-foreground italic">+{uploaded.length - 4} more</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          {summary.fileCount + summary.integrationCount === 0
            ? "Nothing added yet — that's OK, I'll work from your website."
            : `${summary.fileCount > 0 ? `${summary.fileCount} file${summary.fileCount === 1 ? "" : "s"}` : ""}${summary.fileCount > 0 && summary.integrationCount > 0 ? " · " : ""}${summary.integrationCount > 0 ? `${summary.integrationCount} integration${summary.integrationCount === 1 ? "" : "s"} connected` : ""}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground px-3 py-2"
          >
            Skip
          </button>
          <button
            onClick={() => onContinue(summary)}
            className="bg-primary hover:bg-primary/90 text-white text-[14px] font-medium px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            {summary.fileCount + summary.integrationCount > 0
              ? "Forge DNA with my data"
              : "Forge anyway"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-0.5 px-1.5 min-w-[18px] h-[18px] rounded-full bg-primary/15 text-primary text-[10px] font-semibold inline-flex items-center justify-center">
      {children}
    </span>
  );
}
