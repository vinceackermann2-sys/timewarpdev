import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to refresh Google access token
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("Google OAuth credentials not configured");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

// Fetch emails from Gmail — includes snippets for AI context
async function fetchEmails(accessToken: string) {
  try {
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const messages = data.messages || [];

    const emailDetails: any[] = [];
    // Process in batches of 10 to avoid rate limits
    for (let i = 0; i < Math.min(messages.length, 500); i += 10) {
      const batch = messages.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (msg: { id: string }) => {
          try {
            const detailRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!detailRes.ok) return null;
            const detail = await detailRes.json();
            const headers = detail.payload?.headers || [];
            return {
              id: msg.id,
              subject: headers.find((h: any) => h.name === "Subject")?.value || "",
              from: headers.find((h: any) => h.name === "From")?.value || "",
              to: headers.find((h: any) => h.name === "To")?.value || "",
              date: headers.find((h: any) => h.name === "Date")?.value || "",
              snippet: detail.snippet || "",
              labels: detail.labelIds || [],
            };
          } catch {
            return null;
          }
        })
      );
      emailDetails.push(...batchResults.filter(Boolean));
      // Small delay between batches
      if (i + 10 < messages.length) await new Promise(r => setTimeout(r, 100));
    }

    return emailDetails;
  } catch (error) {
    console.error("Error fetching emails:", error);
    return [];
  }
}

// Fetch calendar events
async function fetchCalendarEvents(accessToken: string) {
  try {
    const now = new Date().toISOString();
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${oneYearAgo}&timeMax=${now}&maxResults=2500&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((event: any) => ({
      id: event.id,
      summary: event.summary || "Untitled",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      attendees: event.attendees?.length || 0,
      hasConferencing: !!event.conferenceData,
    }));
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return [];
  }
}

// Fetch Drive documents
async function fetchDriveDocuments(accessToken: string) {
  try {
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document' or mimeType='application/pdf' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/vnd.google-apps.form'&fields=files(id,name,mimeType,modifiedTime,shared)&pageSize=200",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
}

// Fetch spreadsheets
async function fetchSpreadsheets(accessToken: string) {
  try {
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime,shared)&pageSize=100",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error fetching spreadsheets:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting background research sync...");

    // Get all users with connected Google Workspace
    const { data: connections, error: connError } = await supabase
      .from("google_workspace_connections")
      .select("user_id")
      .eq("connected", true);

    if (connError) {
      console.error("Error fetching connections:", connError);
      return new Response(JSON.stringify({ error: connError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connections || connections.length === 0) {
      console.log("No connected users found");
      return new Response(JSON.stringify({ message: "No users to sync", synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${connections.length} connected users to sync`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const conn of connections) {
      try {
        // Get refresh token for this user
        const { data: tokenData, error: tokenError } = await supabase
          .from("google_workspace_tokens")
          .select("refresh_token, access_token, expires_at")
          .eq("user_id", conn.user_id)
          .single();

        if (tokenError || !tokenData?.refresh_token) {
          console.log(`No token found for user ${conn.user_id}`);
          continue;
        }

        // Refresh the access token
        const accessToken = await refreshAccessToken(tokenData.refresh_token);
        if (!accessToken) {
          console.log(`Failed to refresh token for user ${conn.user_id}`);
          errorCount++;
          continue;
        }

        // Fetch all workspace data in parallel
        const [emails, calendarEvents, documents, spreadsheets] = await Promise.all([
          fetchEmails(accessToken),
          fetchCalendarEvents(accessToken),
          fetchDriveDocuments(accessToken),
          fetchSpreadsheets(accessToken),
        ]);

        console.log(`User ${conn.user_id}: ${emails.length} emails, ${calendarEvents.length} events, ${documents.length} docs`);

        // Build top contacts from email data
        const contactCounts: Record<string, number> = {};
        for (const email of emails) {
          const from = (email as any).from?.match(/<(.+)>/)?.[1] || (email as any).from?.trim();
          if (from) contactCounts[from] = (contactCounts[from] || 0) + 1;
        }
        const topContacts = Object.entries(contactCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .map(([email, count]) => ({ email, count }));

        // Build research summary — include ALL data, not sliced
        const researchSummary = {
          lastUpdated: new Date().toISOString(),
          emailPatterns: emails.map((e: any) => ({
            subject: e.subject,
            from: e.from,
            labels: e.labels || e.labelIds,
          })),
          calendarSummary: calendarEvents.map((e: any) => ({
            summary: e.summary,
            start: e.start,
            attendees: e.attendees,
          })),
          documentList: documents.map((d: any) => ({
            name: d.name,
            modified: d.modifiedTime,
          })),
        };

        // Update or insert workspace_research — store ALL raw data
        const { error: upsertError } = await supabase
          .from("workspace_research")
          .upsert(
            {
              user_id: conn.user_id,
              research_summary: researchSummary,
              raw_data: { emails, calendarEvents, documents, spreadsheets, topContacts },
              findings: [],
              emails_analyzed: emails.length,
              events_analyzed: calendarEvents.length,
              documents_analyzed: documents.length,
              sheets_analyzed: spreadsheets.length,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (upsertError) {
          console.error(`Error upserting research for ${conn.user_id}:`, upsertError);
          errorCount++;
        } else {
          syncedCount++;
          console.log(`Successfully synced research for user ${conn.user_id}`);
        }
      } catch (userError) {
        console.error(`Error processing user ${conn.user_id}:`, userError);
        errorCount++;
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: "Sync complete",
        synced: syncedCount,
        errors: errorCount,
        totalUsers: connections.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
