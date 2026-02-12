import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ConnectorType = "Microsoft";

/**
 * Hook to initiate OAuth flows for business connectors.
 * Works without requiring a signed-in user — callbacks auto-create accounts.
 */
export function useConnectorOAuth() {
  const initiateOAuth = useCallback(async (connector: ConnectorType) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const origin = window.location.origin;

      if (connector === "Microsoft") {
        const { data, error } = await supabase.functions.invoke("initiate-microsoft-oauth", {
          body: {
            user_id: userId,
            origin,
            scopes: "offline_access openid email profile User.Read Mail.Read Calendars.Read Files.Read.All",
          },
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No OAuth URL returned");
        }
      }
    } catch (error) {
      console.error(`[useConnectorOAuth] Error initiating ${connector} OAuth:`, error);
      toast.error(`Failed to connect to ${connector}. Please try again.`);
    }
  }, []);

  return { initiateOAuth };
}
