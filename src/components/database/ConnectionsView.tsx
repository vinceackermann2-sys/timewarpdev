import { useState, useEffect, useCallback } from "react";
import { Loader2, Plug, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoMicrosoft from "@/assets/logo-microsoft.png";
import logoSlack from "@/assets/logo-slack.png";
import logoHubspot from "@/assets/logo-hubspot.svg";
import { IntegrationRequestDialog } from "@/components/database/IntegrationRequestDialog";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  comingSoon?: boolean;
}

const integrations: Integration[] = [
  { id: "microsoft", name: "Microsoft", description: "Outlook, OneDrive, Calendar, Teams", logo: logoMicrosoft },
  { id: "slack", name: "Slack", description: "Send messages and interact with Slack workspaces", logo: logoSlack },
  { id: "hubspot", name: "HubSpot", description: "CRM platform for sales, marketing, and customer service", logo: logoHubspot, comingSoon: true },
];

interface ConnectedProvider {
  provider: string;
  email?: string;
}

export function ConnectionsView() {
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

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
      toast.success(`${oauthSuccess.charAt(0).toUpperCase() + oauthSuccess.slice(1)} connected successfully!`);
      window.history.replaceState({}, "", window.location.pathname);
      checkConnections();
      syncProviderData(oauthSuccess);
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
      await (supabase as any).from("user_connections").delete().eq("user_id", session.user.id).eq("provider", providerId);
      setConnectedProviders(prev => prev.filter(p => p.provider !== providerId));
      toast.success(`${providerId.charAt(0).toUpperCase() + providerId.slice(1)} disconnected`);
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const syncProviderData = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-provider-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider, workspaceId: localStorage.getItem("preferred_workspace_id") || undefined }),
        }
      );

      const data = await response.json();
      if (data.success) {
        const s = data.summary;
        toast.success(`Synced ${s.emails || 0} emails, ${s.events || 0} events, ${s.files || 0} files`);
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Failed to sync data");
    }
    setSyncingProvider(null);
  };

  const isProviderConnected = (id: string) => connectedProviders.some(p => p.provider === id);
  const getProviderEmail = (id: string) => connectedProviders.find(p => p.provider === id)?.email;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">Connectors</h1>
          <p className="text-sm text-muted-foreground">
            Link your accounts to sync business data and provide personalized insights.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map(integration => {
            const connected = isProviderConnected(integration.id);
            const email = getProviderEmail(integration.id);
            const isConnecting = connectingProvider === integration.id;
            const isSyncing = syncingProvider === integration.id;

            return (
              <div
                key={integration.id}
                className={`relative flex flex-col gap-3 p-5 rounded-xl border transition-all cursor-pointer group ${
                  integration.comingSoon
                    ? "border-border/50 opacity-60 cursor-default"
                    : connected
                      ? "border-green-500/40 bg-green-500/5 hover:border-green-500/60"
                      : "border-border hover:border-primary/40 hover:shadow-sm"
                }`}
                onClick={() => {
                  if (integration.comingSoon || isConnecting) return;
                  if (connected) return;
                  handleConnect(integration.id);
                }}
              >
                {/* Soon badge */}
                {integration.comingSoon && (
                  <span className="absolute top-4 right-4 text-[11px] font-medium text-muted-foreground">
                    Soon
                  </span>
                )}

                {/* Connected badge */}
                {connected && !integration.comingSoon && (
                  <span className="absolute top-4 right-4">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </span>
                )}

                {/* Logo */}
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center p-1.5">
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <img src={integration.logo} alt={integration.name} className="h-6 w-6 object-contain" />
                  )}
                </div>

                {/* Text */}
                <div>
                  <p className="font-semibold text-sm">{integration.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {integration.description}
                  </p>
                  {connected && email && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 truncate">{email}</p>
                  )}
                </div>

                {/* Connected actions */}
                {connected && !integration.comingSoon && (
                  <div className="flex items-center gap-1 mt-auto pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); syncProviderData(integration.id); }}
                      disabled={isSyncing}
                    >
                      {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Sync
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDisconnect(integration.id); }}
                    >
                      Disconnect
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <IntegrationRequestDialog />
        </div>
      </div>
    </div>
  );
}
