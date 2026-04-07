import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Loader2, Plug, CheckCircle2, RefreshCw, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BgGradient } from "@/components/ui/bg-gradient";
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
  authType: "oauth" | "credentials";
}

const integrations: Integration[] = [
  { id: "microsoft", name: "Microsoft", description: "Outlook, OneDrive, Calendar, Teams", logo: logoMicrosoft, authType: "oauth" },
  { id: "slack", name: "Slack", description: "Channels, Messages, Team Info", logo: logoSlack, authType: "oauth" },
  { id: "hubspot", name: "HubSpot", description: "CRM, Contacts, Deals, Marketing", logo: logoHubspot, authType: "oauth", comingSoon: true },
];

interface ConnectedProvider {
  provider: string;
  email?: string;
}

interface ConnectBusinessDNAProps {
  onComplete: () => void;
  brandId?: string;
}

export function ConnectBusinessDNA({ onComplete, brandId }: ConnectBusinessDNAProps) {
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
          body: JSON.stringify({ provider: providerId, action: "get-auth-url", returnPath: window.location.pathname, origin: window.location.origin, brandId }),
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
      // Scope disconnect by brand_id to only disconnect for this business
      let deleteQuery = (supabase as any).from("user_connections").delete().eq("user_id", session.user.id).eq("provider", providerId);
      if (brandId) {
        // Resolve brand row ID to scope the delete
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ provider: providerId, action: "disconnect", brandId }),
          }
        );
        if (response.ok) {
          setConnectedProviders(prev => prev.filter(p => p.provider !== providerId));
          toast.success(`${providerId.charAt(0).toUpperCase() + providerId.slice(1)} disconnected`);
        } else {
          toast.error("Failed to disconnect");
        }
        return;
      }
      await deleteQuery;
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
          body: JSON.stringify({ provider, brandId, workspaceId: localStorage.getItem("preferred_workspace_id") || undefined }),
        }
      );

      const data = await response.json();
      if (data.success) {
        const s = data.summary;
        if (provider === "wordpress") {
          toast.success(`Synced ${s.posts || 0} posts, ${s.pages || 0} pages, ${s.media || 0} media`);
        } else {
          toast.success(`Synced ${s.emails || 0} emails, ${s.events || 0} events, ${s.files || 0} files`);
        }
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Failed to sync data");
    }
    setSyncingProvider(null);
  };

  const isProviderConnected = (id: string) => connectedProviders.some((p) => p.provider === id);
  const getProviderEmail = (id: string) => connectedProviders.find((p) => p.provider === id)?.email;
  const hasAnyConnection = connectedProviders.length > 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-background">
      <BgGradient
        gradientFrom="hsl(var(--background))"
        gradientTo="hsl(var(--primary) / 0.15)"
        gradientSize="150% 80%"
        gradientPosition="50% 100%"
        gradientStop="70%"
        className="z-0"
      />

      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-5">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-light mb-3">
              Connect your{" "}
              <span className="italic text-primary font-normal">Business DNA</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Link your real accounts to analyze your business data and provide personalized insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4" style={{ maxWidth: "28rem", margin: "0 auto 1rem" }}>
            {integrations.map((integration, index) => {
              const connected = isProviderConnected(integration.id);
              const email = getProviderEmail(integration.id);
              const isConnecting = connectingProvider === integration.id;
              const isSyncing = syncingProvider === integration.id;

              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.35 }}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    connected
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-muted flex items-center justify-center p-2">
                    <img src={integration.logo} alt={integration.name} className="h-7 w-7 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{integration.name}</p>
                    {connected && email && (
                      <p className="text-xs text-green-600 dark:text-green-400 truncate">{email}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {connected ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => syncProviderData(integration.id)} disabled={isSyncing}>
                          {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDisconnect(integration.id)}>
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleConnect(integration.id)} disabled={isConnecting}>
                        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Request Integration */}
          <div className="text-center mb-4">
            <IntegrationRequestDialog />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="ghost" onClick={onComplete} className="text-muted-foreground">
              {hasAnyConnection ? "Continue" : "Skip for now"}
            </Button>
            {hasAnyConnection && (
              <Button onClick={onComplete} className="gap-2">
                Continue to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
