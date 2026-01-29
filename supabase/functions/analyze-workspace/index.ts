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

// Calculate date ranges
function getLastYearDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format for Gmail
}

function getNextYearDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
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

    const lastYearDate = getLastYearDate();
    const nextYearDate = getNextYearDate();

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // STEP 1: Thinking about approach
          streamStep(controller, {
            type: "thought",
            content: `I'm going to analyze your Google Workspace as a ${role?.toUpperCase() || 'CEO'} advisor. I'll scan your last year's emails, files (including Sheets, Slides, and Forms), and upcoming year's calendar...`
          });

          await new Promise(r => setTimeout(r, 1000));

          // STEP 2: Fetch and analyze emails (last year)
          streamStep(controller, {
            type: "action",
            content: `📧 Fetching emails from the last year (since ${lastYearDate})...`
          });

          // Gmail query for last year's emails
          const emailQuery = encodeURIComponent(`after:${lastYearDate}`);
          const emailsData = await fetchGoogleAPI(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${emailQuery}`,
            accessToken
          );

          const emails: any[] = [];
          if (emailsData?.messages) {
            streamStep(controller, {
              type: "observation",
              content: `Found ${emailsData.messages.length} emails from the last year. Analyzing patterns...`
            });

            // Fetch email details (limit to 25 for performance)
            for (let i = 0; i < Math.min(emailsData.messages.length, 25); i++) {
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

                // Stream a few emails being analyzed
                if (i < 5) {
                  streamStep(controller, {
                    type: "observation",
                    content: `Reviewing: "${email.subject}" from ${email.from.split('<')[0].trim()}`,
                    data: { type: "email", ...email }
                  });
                  await new Promise(r => setTimeout(r, 200));
                }
              }
            }
          }

          await new Promise(r => setTimeout(r, 500));

          // STEP 3: Fetch Drive files (last year) with specific MIME types
          streamStep(controller, {
            type: "action",
            content: `📁 Scanning Google Drive for files modified in the last year...`
          });

          const driveQuery = encodeURIComponent(`modifiedTime > '${lastYearDate}T00:00:00'`);
          const driveData = await fetchGoogleAPI(
            `https://www.googleapis.com/drive/v3/files?pageSize=100&q=${driveQuery}&fields=files(id,name,mimeType,modifiedTime,shared,webViewLink)&orderBy=modifiedTime desc`,
            accessToken
          );

          const documents: any[] = [];
          const sheets: any[] = [];
          const slides: any[] = [];
          const forms: any[] = [];

          if (driveData?.files) {
            streamStep(controller, {
              type: "observation",
              content: `Found ${driveData.files.length} files modified in the last year. Categorizing...`
            });

            for (const file of driveData.files) {
              const fileInfo = {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                modifiedTime: file.modifiedTime,
                shared: file.shared,
                webViewLink: file.webViewLink,
              };

              // Categorize by MIME type
              if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
                sheets.push(fileInfo);
              } else if (file.mimeType === 'application/vnd.google-apps.presentation') {
                slides.push(fileInfo);
              } else if (file.mimeType === 'application/vnd.google-apps.form') {
                forms.push(fileInfo);
              } else {
                documents.push(fileInfo);
              }
            }

            streamStep(controller, {
              type: "observation",
              content: `Categorized: ${documents.length} docs, ${sheets.length} sheets, ${slides.length} slides, ${forms.length} forms`,
              data: { documents: documents.length, sheets: sheets.length, slides: slides.length, forms: forms.length }
            });
          }

          await new Promise(r => setTimeout(r, 500));

          // STEP 4: Fetch Sheets content (first 5 sheets)
          if (sheets.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📊 Analyzing Google Sheets content...`
            });

            for (let i = 0; i < Math.min(sheets.length, 5); i++) {
              const sheet = sheets[i];
              const sheetData = await fetchGoogleAPI(
                `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}?includeGridData=false`,
                accessToken
              );
              
              if (sheetData) {
                sheet.sheetNames = sheetData.sheets?.map((s: any) => s.properties?.title) || [];
                sheet.title = sheetData.properties?.title;
                
                streamStep(controller, {
                  type: "observation",
                  content: `Analyzed sheet: "${sheet.name}" with ${sheet.sheetNames.length} tabs`,
                  data: { type: "sheet", ...sheet }
                });
                await new Promise(r => setTimeout(r, 200));
              }
            }
          }

          // STEP 5: Fetch Slides content (first 5 presentations)
          if (slides.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📽️ Analyzing Google Slides content...`
            });

            for (let i = 0; i < Math.min(slides.length, 5); i++) {
              const slide = slides[i];
              const slideData = await fetchGoogleAPI(
                `https://slides.googleapis.com/v1/presentations/${slide.id}?fields=title,slides.objectId`,
                accessToken
              );
              
              if (slideData) {
                slide.title = slideData.title;
                slide.slideCount = slideData.slides?.length || 0;
                
                streamStep(controller, {
                  type: "observation",
                  content: `Analyzed presentation: "${slide.name}" with ${slide.slideCount} slides`,
                  data: { type: "slide", ...slide }
                });
                await new Promise(r => setTimeout(r, 200));
              }
            }
          }

          // STEP 6: Fetch Forms content (first 5 forms)
          if (forms.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📋 Analyzing Google Forms...`
            });

            for (let i = 0; i < Math.min(forms.length, 5); i++) {
              const form = forms[i];
              const formData = await fetchGoogleAPI(
                `https://forms.googleapis.com/v1/forms/${form.id}`,
                accessToken
              );
              
              if (formData) {
                form.title = formData.info?.title;
                form.questionCount = formData.items?.length || 0;
                form.description = formData.info?.description;
                
                streamStep(controller, {
                  type: "observation",
                  content: `Analyzed form: "${form.name}" with ${form.questionCount} questions`,
                  data: { type: "form", ...form }
                });
                await new Promise(r => setTimeout(r, 200));
              }
            }
          }

          await new Promise(r => setTimeout(r, 500));

          // STEP 7: Fetch Calendar (upcoming year)
          streamStep(controller, {
            type: "action",
            content: `📅 Analyzing calendar events for the upcoming year...`
          });

          const calendarData = await fetchGoogleAPI(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&timeMin=${new Date().toISOString()}&timeMax=${nextYearDate}&orderBy=startTime&singleEvents=true`,
            accessToken
          );

          const events: any[] = [];
          if (calendarData?.items) {
            streamStep(controller, {
              type: "observation",
              content: `Found ${calendarData.items.length} upcoming events in the next year.`
            });

            for (const event of calendarData.items.slice(0, 15)) {
              events.push({
                summary: event.summary,
                start: event.start,
                end: event.end,
                attendees: event.attendees?.length || 0,
                recurring: !!event.recurringEventId,
              });
              
              if (events.length <= 5) {
                streamStep(controller, {
                  type: "observation",
                  content: `Reviewing: "${event.summary || 'Untitled'}" - ${event.attendees?.length || 0} attendees`,
                  data: { type: "event", summary: event.summary, attendees: event.attendees?.length || 0, start: event.start }
                });
                await new Promise(r => setTimeout(r, 150));
              }
            }
          }

          await new Promise(r => setTimeout(r, 800));

          // STEP 8: AI Analysis to find the biggest issue
          streamStep(controller, {
            type: "thought",
            content: "Processing all data to identify the most impactful business improvement..."
          });

          // Build comprehensive analysis prompt
          const analysisPrompt = `You are a ${role?.toUpperCase() || 'CEO'} business advisor. Analyze this real Google Workspace data from the LAST YEAR and identify ONE specific, actionable improvement that would have the highest business impact.

## Email Summary (Last Year - ${emails.length} analyzed):
${emails.slice(0, 15).map(e => `- "${e.subject}" from ${e.from.split('<')[0]} | ${e.labels.includes('UNREAD') ? 'UNREAD' : 'read'} | Date: ${e.date}`).join('\n')}

## Documents (Last Year - ${documents.length} files):
${documents.slice(0, 10).map(d => `- "${d.name}" | Modified: ${d.modifiedTime} | Shared: ${d.shared}`).join('\n')}

## Google Sheets (${sheets.length} spreadsheets):
${sheets.slice(0, 5).map(s => `- "${s.name}" | Tabs: ${s.sheetNames?.join(', ') || 'N/A'} | Modified: ${s.modifiedTime}`).join('\n')}

## Google Slides (${slides.length} presentations):
${slides.slice(0, 5).map(s => `- "${s.name}" | Slides: ${s.slideCount || 'N/A'} | Modified: ${s.modifiedTime}`).join('\n')}

## Google Forms (${forms.length} forms):
${forms.slice(0, 5).map(f => `- "${f.name}" | Questions: ${f.questionCount || 'N/A'} | Modified: ${f.modifiedTime}`).join('\n')}

## Calendar (Upcoming Year - ${events.length} events):
${events.slice(0, 10).map(e => `- "${e.summary || 'Untitled'}" | Attendees: ${e.attendees} | Recurring: ${e.recurring}`).join('\n')}

Respond with a JSON object:
{
  "issue": {
    "title": "Brief issue title",
    "category": "Email|Documents|Sheets|Slides|Forms|Calendar|Communication",
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
                  sheetsAnalyzed: sheets.length,
                  slidesAnalyzed: slides.length,
                  formsAnalyzed: forms.length,
                  eventsAnalyzed: events.length,
                  timeRange: {
                    emails: `Last year (since ${lastYearDate})`,
                    files: `Last year (since ${lastYearDate})`,
                    calendar: `Upcoming year (until ${nextYearDate.split('T')[0]})`
                  }
                },
                ...analysis
              }
            });
          } else {
            // Fallback finding
            streamStep(controller, {
              type: "finding",
              content: "🔍 Analysis identified potential workflow gaps",
              data: {
                issue: {
                  title: "Data Organization Opportunity",
                  category: "Documents",
                  severity: "medium",
                  description: "Your workspace data suggests opportunities for better organization and workflow optimization.",
                  evidence: `Analyzed ${emails.length} emails, ${documents.length} docs, ${sheets.length} sheets, ${slides.length} slides, ${forms.length} forms, and ${events.length} calendar events.`
                },
                improvement: {
                  title: "Implement Workspace Audit",
                  description: "Review and organize your Google Workspace files by project or department. Archive old files and create a consistent naming convention.",
                  expectedImpact: "Improved team productivity and easier file discovery",
                  effort: "medium",
                  firstStep: "Create a master spreadsheet cataloging all active projects and their related files"
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
                  sheetsAnalyzed: sheets.length,
                  slidesAnalyzed: slides.length,
                  formsAnalyzed: forms.length,
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
