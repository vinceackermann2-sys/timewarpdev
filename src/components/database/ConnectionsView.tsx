import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerDnaReEnrich } from "@/lib/triggerDnaReEnrich";
import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoMsOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoMsOnenote from "@/assets/logo-ms-onenote.svg";
import logoMsTeams from "@/assets/logo-ms-teams.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoZoom from "@/assets/logo-zoom.svg";
import logoHubspot from "@/assets/logo-hubspot.svg";
import logoGoogleCalendar from "@/assets/logo-google-calendar.svg";
import logoGoogleDrive from "@/assets/logo-google-drive.svg";
import logoGoogleDocs from "@/assets/logo-google-docs.svg";
import logoGoogleSheets from "@/assets/logo-google-sheets.svg";
import logoGoogleSlides from "@/assets/logo-google-slides.svg";
import logoGmail from "@/assets/logo-gmail.svg";
import logoStripe from "@/assets/logo-stripe.svg";
import { IntegrationRequestDialog } from "@/components/database/IntegrationRequestDialog";
import { useWorkspace } from "@/hooks/useWorkspace";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  comingSoon?: boolean;
  section: "microsoft" | "google" | "other";
  iconBg?: string;
}

const integrations: Integration[] = [
  { id: "microsoft_outlook", name: "Microsoft Outlook", description: "Emails, contacts & calendar", logo: logoMsOutlook, section: "microsoft", iconBg: "bg-card" },
  { id: "microsoft_onedrive", name: "Microsoft OneDrive", description: "Upload and read files", logo: logoMsOnedrive, section: "microsoft", iconBg: "bg-card" },
  { id: "microsoft_onenote", name: "Microsoft OneNote", description: "Read and write notes", logo: logoMsOnenote, section: "microsoft", iconBg: "bg-card" },
  { id: "microsoft_teams", name: "Microsoft Teams", description: "Messages and channels", logo: logoMsTeams, section: "microsoft", iconBg: "bg-card" },
  { id: "google_calendar", name: "Google Calendar", description: "Events & scheduling", logo: logoGoogleCalendar, section: "google", iconBg: "bg-card" },
  { id: "google_drive", name: "Google Drive", description: "Files & folders", logo: logoGoogleDrive, section: "google", iconBg: "bg-card" },
  { id: "google_docs", name: "Google Docs", description: "Documents", logo: logoGoogleDocs, section: "google", iconBg: "bg-card" },
  { id: "google_sheets", name: "Google Sheets", description: "Spreadsheets", logo: logoGoogleSheets, section: "google", iconBg: "bg-card" },
  { id: "google_slides", name: "Google Slides", description: "Presentations", logo: logoGoogleSlides, section: "google", iconBg: "bg-card" },
  { id: "google_gmail", name: "Gmail", description: "Emails & contacts", logo: logoGmail, section: "google", iconBg: "bg-card" },
  { id: "slack", name: "Slack", description: "Messages and channels", logo: logoSlack, section: "other" },
  { id: "zoom", name: "Zoom", description: "Meetings and recordings", logo: logoZoom, section: "other", iconBg: "bg-blue-500" },
  { id: "hubspot", name: "HubSpot", description: "CRM, sales, and marketing", logo: logoHubspot, section: "other", iconBg: "bg-orange-100" },
  { id: "stripe", name: "Stripe", description: "Payments, customers & revenue", logo: logoStripe, section: "other", iconBg: "bg-card" },
];

interface ConnectedProvider {
  provider: string;
  email?: string;
}

function ConnectionCardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </div>
  );
}

function IntegrationIcon({ integration, isConnecting }: { integration: Integration; isConnecting: boolean }) {
  if (isConnecting) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }
  return <img src={integration.logo} alt={integration.name} className="h-6 w-6 object-contain" loading="lazy" />;
}

function ConnectionCard({
  integration,
  connected,
  email,
  isConnecting,
  statusLoaded,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  connected: boolean;
  email?: string;
  isConnecting: boolean;
  statusLoaded: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div
      className={`relative flex flex-row items-center p-4 gap-4 rounded-xl border border-slate-200/80 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/60 transition-all duration-300 group hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 ${
        integration.comingSoon ? "opacity-60 cursor-default" : ""
      }`}
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center border border-border/40 shadow-sm overflow-hidden bg-white dark:bg-zinc-950 shrink-0`}>
        <IntegrationIcon integration={integration} isConnecting={isConnecting} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[14px] leading-tight text-foreground truncate">{integration.name}</p>
          {integration.comingSoon && (
            <span className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground px-1.5 py-0.5 rounded-full border border-border/40 bg-muted/30">Soon</span>
          )}
          {statusLoaded && connected && !integration.comingSoon && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          )}
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5 truncate">{integration.description}</p>
        {statusLoaded && connected && email && (
          <p className="text-[10px] text-muted-foreground font-medium mt-1 truncate max-w-full rounded bg-white/60 dark:bg-black/40 px-1.5 py-0.5 inline-flex border border-border/20">{email}</p>
        )}
      </div>

      <div className="shrink-0 w-28">
        {!statusLoaded && !integration.comingSoon && (
          <Skeleton className="h-8 w-full rounded-md" />
        )}
        {statusLoaded && !connected && !integration.comingSoon && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full text-[12px] gap-1.5 font-medium shadow-sm bg-white dark:bg-zinc-900"
            disabled={isConnecting}
            onClick={() => onConnect()}
          >
            <Plug className="h-3.5 w-3.5 text-muted-foreground" />
            Connect
          </Button>
        )}
        {statusLoaded && connected && !integration.comingSoon && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full text-[12px] gap-1.5 font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDisconnect()}
          >
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        )}
      </div>
    </div>
  );
}

export function ConnectionsView() {
  const { activeWorkspaceId } = useWorkspace();
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  const checkConnections = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsLoading(false); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "check-status", workspaceId: activeWorkspaceId ?? null }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConnectedProviders(data.connected || []);
      }
    } catch (err) {
      console.error("Failed to check connections:", err);
    }
    setIsLoading(false);
    setStatusLoaded(true);
  }, [activeWorkspaceId]);

  useEffect(() => { checkConnections(); }, [checkConnections]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");
    const brandIdParam = params.get("brand_id") || params.get("brandId") || undefined;
    if (oauthSuccess) {
      const label = integrations.find(i => i.id === oauthSuccess)?.name || oauthSuccess;
      toast.success(`${label} connected successfully!`);
      window.history.replaceState({}, "", window.location.pathname);
      checkConnections();
      // Background DNA re-enrichment so newly-connected data flows into the pillars.
      void triggerDnaReEnrich(brandIdParam);
    } else if (oauthError) {
      toast.error(`Connection failed: ${oauthError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [checkConnections]);

  // AppShell strips ?oauth_success from the URL before this view's own effect
  // can read it. Listen for the broadcast it emits so we still re-fetch status.
  useEffect(() => {
    const handler = () => { void checkConnections(); };
    window.addEventListener("oauth_connection_completed", handler);
    return () => window.removeEventListener("oauth_connection_completed", handler);
  }, [checkConnections]);

  const handleConnect = async (providerId: string) => {
    setConnectingProvider(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in first"); setConnectingProvider(null); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider: providerId, action: "get-auth-url", returnPath: window.location.pathname, origin: window.location.origin, workspaceId: activeWorkspaceId ?? null }),
        }
      );

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to get authorization URL");
      }
    } catch (err) {
      console.error("Connect error:", err);
      toast.error("Failed to start connection");
    }
    setConnectingProvider(null);
  };

  const handleDisconnect = async (providerId: string) => {
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
        setConnectedProviders(prev => prev.filter(p => p.provider !== providerId));
        const label = integrations.find(i => i.id === providerId)?.name || providerId;
        toast.success(`${label} disconnected`);
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const isProviderConnected = (id: string) => connectedProviders.some(p => p.provider === id);
  const getProviderEmail = (id: string) => connectedProviders.find(p => p.provider === id)?.email;

  const microsoftIntegrations = integrations.filter(i => i.section === "microsoft");
  const googleIntegrations = integrations.filter(i => i.section === "google");
  const otherIntegrations = integrations.filter(i => i.section === "other");


  return (
    <div className="h-full min-h-0 max-h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">Connectors</h1>
          <p className="text-sm text-muted-foreground">
            Connect individual services with only the permissions they need.
          </p>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider mb-3 text-foreground">Microsoft 365</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {microsoftIntegrations.map(integration => (
              <ConnectionCard
                key={integration.id}
                integration={integration}
                connected={isProviderConnected(integration.id)}
                email={getProviderEmail(integration.id)}
                isConnecting={connectingProvider === integration.id}
                statusLoaded={statusLoaded}
                onConnect={() => handleConnect(integration.id)}
                onDisconnect={() => handleDisconnect(integration.id)}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider mb-3 text-foreground">Google Workspace</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {googleIntegrations.map(integration => (
              <ConnectionCard
                key={integration.id}
                integration={integration}
                connected={isProviderConnected(integration.id)}
                email={getProviderEmail(integration.id)}
                isConnecting={connectingProvider === integration.id}
                statusLoaded={statusLoaded}
                onConnect={() => handleConnect(integration.id)}
                onDisconnect={() => handleDisconnect(integration.id)}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider mb-3 text-foreground">Other</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherIntegrations.map(integration => (
              <ConnectionCard
                key={integration.id}
                integration={integration}
                connected={isProviderConnected(integration.id)}
                email={getProviderEmail(integration.id)}
                isConnecting={connectingProvider === integration.id}
                statusLoaded={statusLoaded}
                onConnect={() => handleConnect(integration.id)}
                onDisconnect={() => handleDisconnect(integration.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <IntegrationRequestDialog />
        </div>
      </div>
    </div>
  );
}
