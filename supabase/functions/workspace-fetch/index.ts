import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WorkspaceData {
  emails: any[];
  documents: any[];
  spreadsheets: any[];
  calendarEvents: any[];
}

async function fetchWithAuth(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    console.error(`API error for ${url}:`, response.status, await response.text());
    return null;
  }
  
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // Get the user's session to extract the provider token securely
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Failed to get user:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Failed to get user session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // The provider_token should be in the user's identities or we need to get it from session
    // For Google OAuth, the access token is stored in the session
    // We need the client to pass their session's access_token which we validate above
    // Then we get the provider_token from the session
    
    // Get session to access provider_token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // Since we're in an edge function context, we need to use the admin approach
    // or get the provider token passed from client after proper validation
    // For now, we'll check if provider_token was passed in body (validated by the JWT check above)
    
    const body = await req.json().catch(() => ({}));
    const { accessToken } = body;
    
    // If no access token is provided, explain how to get one
    if (!accessToken) {
      console.log("No access token provided for user:", userId);
      return new Response(
        JSON.stringify({ 
          error: "Google access token required",
          message: "Please re-authenticate with Google to access workspace data"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate the token is for Google by making a simple call
    // This also verifies the token is valid
    const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    
    if (!tokenInfoResponse.ok) {
      console.error("Invalid Google access token for user:", userId);
      return new Response(
        JSON.stringify({ error: "Invalid or expired Google access token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenInfo = await tokenInfoResponse.json();
    console.log(`Fetching Google Workspace data for user: ${userId}, token issued to: ${tokenInfo.email}`);

    // Fetch data from all APIs in parallel
    const [emailsData, driveData, calendarData] = await Promise.all([
      // Gmail - Get recent threads
      fetchWithAuth(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50",
        accessToken
      ),
      // Drive - Get recent files
      fetchWithAuth(
        "https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,modifiedTime,owners,shared)",
        accessToken
      ),
      // Calendar - Get upcoming events
      fetchWithAuth(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&timeMin=${new Date().toISOString()}&orderBy=startTime&singleEvents=true`,
        accessToken
      ),
    ]);

    // Fetch email details for top 20 messages
    const emails: any[] = [];
    if (emailsData?.messages) {
      const messagePromises = emailsData.messages.slice(0, 20).map((msg: any) =>
        fetchWithAuth(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          accessToken
        )
      );
      const messageDetails = await Promise.all(messagePromises);
      
      for (const msg of messageDetails) {
        if (msg) {
          const headers = msg.payload?.headers || [];
          emails.push({
            id: msg.id,
            threadId: msg.threadId,
            subject: headers.find((h: any) => h.name === "Subject")?.value || "(No subject)",
            from: headers.find((h: any) => h.name === "From")?.value || "Unknown",
            date: headers.find((h: any) => h.name === "Date")?.value,
            snippet: msg.snippet,
            labelIds: msg.labelIds,
          });
        }
      }
    }

    // Process documents from Drive
    const documents: any[] = [];
    const spreadsheets: any[] = [];
    
    if (driveData?.files) {
      for (const file of driveData.files) {
        const fileInfo = {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          owners: file.owners,
          shared: file.shared,
        };
        
        if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
          spreadsheets.push(fileInfo);
        } else if (
          file.mimeType === "application/vnd.google-apps.document" ||
          file.mimeType === "application/pdf" ||
          file.mimeType?.startsWith("text/")
        ) {
          documents.push(fileInfo);
        }
      }
    }

    // Process calendar events
    const calendarEvents: any[] = [];
    if (calendarData?.items) {
      for (const event of calendarData.items) {
        calendarEvents.push({
          id: event.id,
          summary: event.summary || "(No title)",
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          attendees: event.attendees?.length || 0,
          organizer: event.organizer?.email,
          status: event.status,
          hasConferencing: !!event.conferenceData,
        });
      }
    }

    const workspaceData: WorkspaceData = {
      emails,
      documents,
      spreadsheets,
      calendarEvents,
    };

    console.log(`Fetched for user ${userId}: ${emails.length} emails, ${documents.length} docs, ${spreadsheets.length} sheets, ${calendarEvents.length} events`);

    return new Response(JSON.stringify(workspaceData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Workspace fetch error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
