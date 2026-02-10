import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ConnectorType = "Google" | "Microsoft" | "Slack";

/**
 * Hook to initiate OAuth flows for business connectors.
 * Each connector launches its server-side OAuth initiation endpoint.
 */
export function useConnectorOAuth() {
  const initiateOAuth = useCallback(async (connector: ConnectorType) => {
    try {
      // Get current user session (optional - proceed even without auth)
      const { data: { session } } = await supabase.auth.getSession();

      const userId = session?.user?.id ?? "anonymous";
      const origin = window.location.origin;

      if (connector === "Google") {
        const { data, error } = await supabase.functions.invoke("initiate-google-oauth", {
          body: {
            user_id: userId,
            origin,
            scopes: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly",
          },
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } else if (connector === "Microsoft") {
        const { data, error } = await supabase.functions.invoke("initiate-microsoft-oauth", {
          body: {
            user_id: userId,
            origin,
            scopes: "openid email profile User.Read Mail.Read Calendars.Read Files.Read.All",
          },
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } else if (connector === "Slack") {
        const { data, error } = await supabase.functions.invoke("initiate-slack-oauth", {
          body: { origin },
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error(`[useConnectorOAuth] Error initiating ${connector} OAuth:`, error);
      toast.error(`Failed to connect to ${connector}. Please try again.`);
    }
  }, []);

  return { initiateOAuth };
}
