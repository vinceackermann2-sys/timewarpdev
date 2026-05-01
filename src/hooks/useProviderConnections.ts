import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Retry on transient edge-runtime degradations (503 / boot races).
async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status !== 503) return res;
    } catch (err) {
      if (attempt === retries) throw err;
    }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  return fetch(url, init);
}

export function useProviderConnections(activeBrandId?: string | null, activeWorkspaceId?: string | null) {
  const [connectedProviders, setConnectedProviders] = useState<Record<string, boolean>>({});
  const [connectingProvider, setConnectingProvider] = useState<string | false>(false);

  const checkConnection = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const response = await fetchWithRetry(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "check-status", workspaceId: activeWorkspaceId ?? null }),
      });
      if (response.ok) {
        const data = await response.json();
        const map: Record<string, boolean> = {};
        for (const c of data.connected || []) map[c.provider] = true;
        setConnectedProviders(map);
      }
    } catch (err) {
      console.error("Check connection error:", err);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    if (oauthSuccess) {
      window.history.replaceState({}, "", window.location.pathname);
      void checkConnection();
    }
  }, [checkConnection]);

  const handleProviderConnect = async (provider: string) => {
    setConnectingProvider(provider);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        setConnectingProvider(false);
        return;
      }
      const response = await fetchWithRetry(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          provider,
          action: "get-auth-url",
          returnPath: window.location.pathname,
          origin: window.location.origin,
          brandId: activeBrandId,
          workspaceId: activeWorkspaceId ?? null,
        }),
      });
      const data = await response.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else toast.error(data.error || "Failed to get authorization URL");
    } catch {
      toast.error("Failed to start connection");
    }
    setConnectingProvider(false);
  };

  const handleProviderDisconnect = async (provider: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await fetchWithRetry(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ provider, action: "disconnect" }),
      });
      setConnectedProviders((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} disconnected`);
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return {
    connectedProviders,
    connectingProvider,
    checkConnection,
    handleProviderConnect,
    handleProviderDisconnect,
  };
}
