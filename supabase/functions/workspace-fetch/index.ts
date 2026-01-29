import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Access token is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Fetching Google Workspace data...");

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

    console.log(`Fetched: ${emails.length} emails, ${documents.length} docs, ${spreadsheets.length} sheets, ${calendarEvents.length} events`);

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
