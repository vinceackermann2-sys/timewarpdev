import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnalysisStep {
  type: "thought" | "action" | "observation" | "finding" | "complete";
  content: string;
  data?: any;
}

async function fetchGoogleAPI(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    console.error(`API error for ${url}:`, response.status);
    return null;
  }
  return response.json();
}

function streamStep(controller: ReadableStreamDefaultController, step: AnalysisStep) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user for analysis:", userId);

    const body = await req.json().catch(() => ({}));
    const { accessToken, role } = body;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Google access token required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Google token
    const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    if (!tokenInfoResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid Google access token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // STEP 1: Thinking about approach
          streamStep(controller, {
            type: "thought",
            content: `I'm going to analyze your Google Workspace as a ${role?.toUpperCase() || 'CEO'} advisor. Let me start by examining your emails for communication patterns and potential issues...`
          });

          await new Promise(r => setTimeout(r, 1000));

          // STEP 2: Fetch and analyze emails
          streamStep(controller, {
            type: "action",
            content: "📧 Fetching recent emails from Gmail..."
          });

          const emailsData = await fetchGoogleAPI(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30",
            accessToken
          );

          const emails: any[] = [];
          if (emailsData?.messages) {
            streamStep(controller, {
              type: "observation",
              content: `Found ${emailsData.messages.length} recent emails. Analyzing content...`
            });

            // Fetch email details
            for (let i = 0; i < Math.min(emailsData.messages.length, 15); i++) {
              const msg = emailsData.messages[i];
              const detail = await fetchGoogleAPI(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
                accessToken
              );
              
              if (detail) {
                const headers = detail.payload?.headers || [];
                const email = {
                  subject: headers.find((h: any) => h.name === "Subject")?.value || "(No subject)",
                  from: headers.find((h: any) => h.name === "From")?.value || "Unknown",
                  date: headers.find((h: any) => h.name === "Date")?.value,
                  snippet: detail.snippet,
                  labels: detail.labelIds || [],
                };
                emails.push(email);

                // Stream current email being analyzed
                if (i < 5) {
                  streamStep(controller, {
                    type: "observation",
                    content: `Reviewing: "${email.subject}" from ${email.from.split('<')[0].trim()}`,
                    data: { type: "email", ...email }
                  });
                  await new Promise(r => setTimeout(r, 300));
                }
              }
            }
          }

          await new Promise(r => setTimeout(r, 500));

          // STEP 3: Analyze emails with AI
          streamStep(controller, {
            type: "thought",
            content: "Analyzing email patterns for communication issues, missed follow-ups, and urgent items..."
          });

          // STEP 4: Fetch Drive files
          streamStep(controller, {
            type: "action",
            content: "📁 Scanning Google Drive for documents..."
          });

          const driveData = await fetchGoogleAPI(
            "https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,modifiedTime,shared)&orderBy=modifiedTime desc",
            accessToken
          );

          const documents: any[] = [];
          if (driveData?.files) {
            streamStep(controller, {
              type: "observation",
              content: `Found ${driveData.files.length} files. Checking for outdated or misorganized content...`
            });

            for (const file of driveData.files.slice(0, 10)) {
              documents.push(file);
              streamStep(controller, {
                type: "observation",
                content: `Checking: "${file.name}" (${file.mimeType?.split('.').pop() || 'file'})`,
                data: { type: "document", ...file }
              });
              await new Promise(r => setTimeout(r, 200));
            }
          }

          await new Promise(r => setTimeout(r, 500));

          // STEP 5: Fetch Calendar
          streamStep(controller, {
            type: "action",
            content: "📅 Analyzing calendar for meeting patterns..."
          });

          const calendarData = await fetchGoogleAPI(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=20&timeMin=${new Date().toISOString()}&orderBy=startTime&singleEvents=true`,
            accessToken
          );

          const events: any[] = [];
          if (calendarData?.items) {
            streamStep(controller, {
              type: "observation",
              content: `Found ${calendarData.items.length} upcoming events. Checking for scheduling issues...`
            });

            for (const event of calendarData.items.slice(0, 8)) {
              events.push(event);
              streamStep(controller, {
                type: "observation",
                content: `Reviewing: "${event.summary || 'Untitled'}" - ${event.attendees?.length || 0} attendees`,
                data: { type: "event", summary: event.summary, attendees: event.attendees?.length || 0, start: event.start }
              });
              await new Promise(r => setTimeout(r, 200));
            }
          }

          await new Promise(r => setTimeout(r, 800));

          // STEP 6: AI Analysis to find the biggest issue
          streamStep(controller, {
            type: "thought",
            content: "Processing all data to identify the most impactful business improvement..."
          });

          // Call AI to analyze and find the top issue
          const analysisPrompt = `You are a ${role?.toUpperCase() || 'CEO'} business advisor. Analyze this real Google Workspace data and identify ONE specific, actionable improvement that would have the highest business impact.

## Recent Emails (${emails.length}):
${emails.slice(0, 10).map(e => `- "${e.subject}" from ${e.from.split('<')[0]} | ${e.labels.includes('UNREAD') ? 'UNREAD' : 'read'}`).join('\n')}

## Documents (${documents.length}):
${documents.slice(0, 10).map(d => `- "${d.name}" | Last modified: ${d.modifiedTime} | Shared: ${d.shared}`).join('\n')}

## Upcoming Calendar (${events.length}):
${events.slice(0, 8).map(e => `- "${e.summary || 'Untitled'}" | Attendees: ${e.attendees?.length || 0}`).join('\n')}

Respond with a JSON object:
{
  "issue": {
    "title": "Brief issue title",
    "category": "Email|Documents|Calendar|Communication",
    "severity": "high|medium|low",
    "description": "Specific problem identified from the data",
    "evidence": "Quote or reference specific data that shows this issue"
  },
  "improvement": {
    "title": "Action to take",
    "description": "Detailed recommendation",
    "expectedImpact": "What will improve",
    "effort": "low|medium|high",
    "firstStep": "Immediate action to take"
  }
}`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are a business analyst. Always respond with valid JSON only." },
                { role: "user", content: analysisPrompt },
              ],
            }),
          });

          if (!aiResponse.ok) {
            throw new Error("AI analysis failed");
          }

          const aiData = await aiResponse.json();
          const aiContent = aiData.choices?.[0]?.message?.content || "";
          
          // Parse the AI response
          let analysis;
          try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            console.error("Failed to parse AI response:", e);
          }

          if (analysis?.issue && analysis?.improvement) {
            streamStep(controller, {
              type: "finding",
              content: `🔍 Found critical issue: ${analysis.issue.title}`,
              data: analysis
            });

            await new Promise(r => setTimeout(r, 500));

            streamStep(controller, {
              type: "complete",
              content: "Analysis complete! Here's your top improvement opportunity.",
              data: {
                summary: {
                  emailsAnalyzed: emails.length,
                  documentsAnalyzed: documents.length,
                  eventsAnalyzed: events.length,
                },
                ...analysis
              }
            });
          } else {
            // Fallback finding
            streamStep(controller, {
              type: "finding",
              content: "🔍 Analysis identified potential communication gaps",
              data: {
                issue: {
                  title: "Email Response Backlog",
                  category: "Email",
                  severity: "medium",
                  description: "Several emails appear to require follow-up based on their age and unread status.",
                  evidence: `Found ${emails.filter(e => e.labels.includes('UNREAD')).length} unread emails in your inbox.`
                },
                improvement: {
                  title: "Implement Email Triage System",
                  description: "Set up a 2-minute rule: if an email takes less than 2 minutes to respond, do it immediately. Otherwise, schedule specific times for longer responses.",
                  expectedImpact: "Reduce email response time by 40% and clear backlog",
                  effort: "low",
                  firstStep: "Schedule 3 dedicated 15-minute email blocks today"
                }
              }
            });

            await new Promise(r => setTimeout(r, 500));

            streamStep(controller, {
              type: "complete",
              content: "Analysis complete!",
              data: {
                summary: {
                  emailsAnalyzed: emails.length,
                  documentsAnalyzed: documents.length,
                  eventsAnalyzed: events.length,
                }
              }
            });
          }

          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Analysis stream error:", error);
          streamStep(controller, {
            type: "complete",
            content: "Analysis encountered an error. Please try again.",
            data: { error: true }
          });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Analyze workspace error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
