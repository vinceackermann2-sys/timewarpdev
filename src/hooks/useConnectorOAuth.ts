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
        // Slack uses bot-level OAuth (already installed via slack-oauth)
        // For user-level linking, redirect to Slack OAuth
        const slackClientId = import.meta.env.VITE_SLACK_CLIENT_ID;
        if (!slackClientId) {
          // Use edge function approach instead
          toast.info("Connecting to Slack...");
          // Slack is already connected at team level via slack-oauth
          // Check if installation exists
          const { data: installations } = await supabase
            .from("slack_installations")
            .select("team_name")
            .limit(1);

          if (installations && installations.length > 0) {
            toast.success(`Already connected to Slack workspace: ${installations[0].team_name}`);
          } else {
            toast.error("Slack workspace not yet connected. Please install the Slack app first.");
          }
          return;
        }

        const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-oauth`;
        const slackScopes = "channels:history,channels:read,chat:write,users:read";
        const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${slackClientId}&scope=${slackScopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        window.location.href = slackUrl;
      }
    } catch (error) {
      console.error(`[useConnectorOAuth] Error initiating ${connector} OAuth:`, error);
      toast.error(`Failed to connect to ${connector}. Please try again.`);
    }
  }, []);

  return { initiateOAuth };
}
