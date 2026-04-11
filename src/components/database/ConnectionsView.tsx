import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoMsOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoMsOnenote from "@/assets/logo-ms-onenote.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoZoom from "@/assets/logo-zoom.svg";
import logoHubspot from "@/assets/logo-hubspot.svg";
import { IntegrationRequestDialog } from "@/components/database/IntegrationRequestDialog";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  comingSoon?: boolean;
  section: "microsoft" | "other";
  iconBg?: string;
}

const integrations: Integration[] = [
  { id: "microsoft_outlook", name: "Microsoft Outlook", description: "Emails, contacts & calendar", logo: logoMsOutlook, section: "microsoft", iconBg: "bg-white" },
  { id: "microsoft_onedrive", name: "Microsoft OneDrive", description: "Upload and read files", logo: logoMsOnedrive, section: "microsoft", iconBg: "bg-white" },
  { id: "microsoft_onenote", name: "Microsoft OneNote", description: "Read and write notes", logo: logoMsOnenote, section: "microsoft", iconBg: "bg-white" },
  { id: "slack", name: "Slack", description: "Messages and channels", logo: logoSlack, section: "other" },
  { id: "zoom", name: "Zoom", description: "Meetings and recordings", logo: logoZoom, section: "other", iconBg: "bg-blue-500" },
  { id: "hubspot", name: "HubSpot", description: "CRM, sales, and marketing", logo: logoHubspot, section: "other", iconBg: "bg-orange-100" },
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
  return <img src={integration.logo} alt={integration.name} className="h-8 w-8 object-contain" loading="lazy" />;
}

function ConnectionCard({
  integration,
  connected,
  email,
  isConnecting,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  connected: boolean;
  email?: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col gap-3 p-5 rounded-xl border transition-all group ${
        integration.comingSoon
          ? "border-border/50 opacity-60 cursor-default"
          : connected
            ? "border-green-500/40"
            : "border-transparent hover:border-primary/40 hover:shadow-sm"
      }`}
      style={{ backgroundColor: integration.comingSoon ? undefined : "#F8F6F2" }}
    >
      {integration.comingSoon && (
        <span className="absolute top-4 right-4 text-[11px] font-medium text-muted-foreground">Soon</span>
      )}
      {connected && !integration.comingSoon && (
        <span className="absolute top-4 right-4">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </span>
      )}
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center p-2 ${integration.iconBg || "bg-muted"}`}>
        <IntegrationIcon integration={integration} isConnecting={isConnecting} />
      </div>
      <div>
        <p className="font-semibold text-sm">{integration.name}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{integration.description}</p>
        {connected && email && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1 truncate">{email}</p>
        )}
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1 w-full">
        {!connected && !integration.comingSoon && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 w-full"
            disabled={isConnecting}
            onClick={() => onConnect()}
          >
            <Plug className="h-3.5 w-3.5" />
            Connect
          </Button>
        )}
        {connected && !integration.comingSoon && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 w-full"
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
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
          body: JSON.stringify({ action: "check-status" }),
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
  }, []);

  useEffect(() => { checkConnections(); }, [checkConnections]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");
    if (oauthSuccess) {
      const label = integrations.find(i => i.id === oauthSuccess)?.name || oauthSuccess;
      toast.success(`${label} connected successfully!`);
      window.history.replaceState({}, "", window.location.pathname);
      checkConnections();
    } else if (oauthError) {
      toast.error(`Connection failed: ${oauthError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
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
          body: JSON.stringify({ provider: providerId, action: "get-auth-url", returnPath: window.location.pathname, origin: window.location.origin }),
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
          body: JSON.stringify({ provider: providerId, action: "disconnect" }),
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
  const otherIntegrations = integrations.filter(i => i.section === "other");

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ConnectionCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">Connectors</h1>
          <p className="text-sm text-muted-foreground">
            Connect individual services with only the permissions they need.
          </p>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Microsoft 365</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {microsoftIntegrations.map(integration => (
              <ConnectionCard
                key={integration.id}
                integration={integration}
                connected={isProviderConnected(integration.id)}
                email={getProviderEmail(integration.id)}
                isConnecting={connectingProvider === integration.id}
                onConnect={() => handleConnect(integration.id)}
                onDisconnect={() => handleDisconnect(integration.id)}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Other</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherIntegrations.map(integration => (
              <ConnectionCard
                key={integration.id}
                integration={integration}
                connected={isProviderConnected(integration.id)}
                email={getProviderEmail(integration.id)}
                isConnecting={connectingProvider === integration.id}
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
