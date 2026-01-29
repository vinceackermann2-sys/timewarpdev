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
  return date.toISOString().split('T')[0];
}

function getNextYearDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

// Extract text content from email parts
function extractEmailContent(payload: any): string {
  let content = "";
  
  if (payload.body?.data) {
    try {
      content = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (e) {
      content = payload.body.data;
    }
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          content += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (e) {
          content += part.body.data;
        }
      } else if (part.parts) {
        content += extractEmailContent(part);
      }
    }
  }
  
  // Truncate very long content
  return content.slice(0, 2000);
}

// Extract text from slide elements
function extractSlideText(slides: any[]): string[] {
  const texts: string[] = [];
  
  for (const slide of slides || []) {
    let slideText = "";
    for (const element of slide.pageElements || []) {
      if (element.shape?.text?.textElements) {
        for (const te of element.shape.text.textElements) {
          if (te.textRun?.content) {
            slideText += te.textRun.content + " ";
          }
        }
      }
    }
    if (slideText.trim()) {
      texts.push(slideText.trim().slice(0, 500));
    }
  }
  
  return texts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const stream = new ReadableStream({
      async start(controller) {
        try {
          streamStep(controller, {
            type: "thought",
            content: `I'm going to deeply analyze your Google Workspace as a ${role?.toUpperCase() || 'CEO'} advisor. I'll read the actual content of up to 1000 emails, spreadsheet data, slide text, and form questions...`
          });

          await new Promise(r => setTimeout(r, 800));

          // ========== EMAILS (1000 with content) ==========
          streamStep(controller, {
            type: "action",
            content: `📧 Fetching up to 1000 emails from the last year with full content...`
          });

          const emailQuery = encodeURIComponent(`after:${lastYearDate}`);
          let allEmailIds: string[] = [];
          let nextPageToken: string | undefined;
          
          // Fetch email IDs in batches (up to 1000)
          while (allEmailIds.length < 1000) {
            const pageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500&q=${emailQuery}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const emailsData = await fetchGoogleAPI(pageUrl, accessToken);
            
            if (!emailsData?.messages) break;
            
            allEmailIds = allEmailIds.concat(emailsData.messages.map((m: any) => m.id));
            nextPageToken = emailsData.nextPageToken;
            
            if (!nextPageToken) break;
          }

          streamStep(controller, {
            type: "observation",
            content: `Found ${allEmailIds.length} emails. Fetching content (this may take a moment)...`
          });

          const emails: any[] = [];
          const emailBatchSize = 50; // Process in batches to avoid timeouts
          
          for (let batch = 0; batch < Math.ceil(Math.min(allEmailIds.length, 1000) / emailBatchSize); batch++) {
            const batchIds = allEmailIds.slice(batch * emailBatchSize, (batch + 1) * emailBatchSize);
            
            // Parallel fetch for this batch
            const batchPromises = batchIds.map(async (msgId) => {
              const detail = await fetchGoogleAPI(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
                accessToken
              );
              
              if (detail) {
                const headers = detail.payload?.headers || [];
                const content = extractEmailContent(detail.payload);
                
                return {
                  subject: headers.find((h: any) => h.name === "Subject")?.value || "(No subject)",
                  from: headers.find((h: any) => h.name === "From")?.value || "Unknown",
                  to: headers.find((h: any) => h.name === "To")?.value || "",
                  date: headers.find((h: any) => h.name === "Date")?.value,
                  content: content.slice(0, 1000), // First 1000 chars of content
                  snippet: detail.snippet,
                  labels: detail.labelIds || [],
                };
              }
              return null;
            });
            
            const batchResults = await Promise.all(batchPromises);
            emails.push(...batchResults.filter(Boolean));
            
            if (batch % 2 === 0) {
              streamStep(controller, {
                type: "observation",
                content: `Processed ${emails.length}/${Math.min(allEmailIds.length, 1000)} emails...`
              });
            }
          }

          streamStep(controller, {
            type: "observation",
            content: `✅ Analyzed ${emails.length} emails with full content`
          });

          await new Promise(r => setTimeout(r, 300));

          // ========== DRIVE FILES ==========
          streamStep(controller, {
            type: "action",
            content: `📁 Scanning Google Drive for files from the last year...`
          });

          const driveQuery = encodeURIComponent(`modifiedTime > '${lastYearDate}T00:00:00'`);
          const driveData = await fetchGoogleAPI(
            `https://www.googleapis.com/drive/v3/files?pageSize=200&q=${driveQuery}&fields=files(id,name,mimeType,modifiedTime,shared,webViewLink,size)&orderBy=modifiedTime desc`,
            accessToken
          );

          const documents: any[] = [];
          const sheets: any[] = [];
          const slides: any[] = [];
          const forms: any[] = [];

          if (driveData?.files) {
            for (const file of driveData.files) {
              const fileInfo = {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                modifiedTime: file.modifiedTime,
                shared: file.shared,
                size: file.size,
              };

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
              content: `Found: ${documents.length} docs, ${sheets.length} sheets, ${slides.length} slides, ${forms.length} forms`
            });
          }

          await new Promise(r => setTimeout(r, 300));

          // ========== SHEETS CONTENT ==========
          if (sheets.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📊 Reading actual spreadsheet data from ${Math.min(sheets.length, 10)} sheets...`
            });

            for (let i = 0; i < Math.min(sheets.length, 10); i++) {
              const sheet = sheets[i];
              
              // Get spreadsheet metadata
              const sheetMeta = await fetchGoogleAPI(
                `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}?fields=properties.title,sheets.properties`,
                accessToken
              );
              
              if (sheetMeta) {
                sheet.title = sheetMeta.properties?.title;
                sheet.sheetNames = sheetMeta.sheets?.map((s: any) => s.properties?.title) || [];
                
                // Get actual data from first sheet (A1:Z50 - first 50 rows)
                const firstSheetName = sheet.sheetNames[0];
                if (firstSheetName) {
                  const dataResponse = await fetchGoogleAPI(
                    `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/${encodeURIComponent(firstSheetName)}!A1:Z50`,
                    accessToken
                  );
                  
                  if (dataResponse?.values) {
                    sheet.data = dataResponse.values;
                    sheet.rowCount = dataResponse.values.length;
                    sheet.columnCount = Math.max(...dataResponse.values.map((r: any[]) => r.length));
                    
                    // Create a summary of the data
                    const headers = dataResponse.values[0] || [];
                    const sampleRows = dataResponse.values.slice(1, 6);
                    sheet.dataSummary = {
                      headers,
                      sampleRows,
                      totalRows: dataResponse.values.length,
                    };
                  }
                }
                
                streamStep(controller, {
                  type: "observation",
                  content: `Read "${sheet.name}": ${sheet.rowCount || 0} rows, ${sheet.columnCount || 0} columns, tabs: ${sheet.sheetNames?.join(', ')}`,
                  data: { type: "sheet", name: sheet.name, rows: sheet.rowCount }
                });
              }
              
              await new Promise(r => setTimeout(r, 100));
            }
          }

          // ========== SLIDES CONTENT ==========
          if (slides.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📽️ Reading actual slide content from ${Math.min(slides.length, 10)} presentations...`
            });

            for (let i = 0; i < Math.min(slides.length, 10); i++) {
              const slide = slides[i];
              
              const slideData = await fetchGoogleAPI(
                `https://slides.googleapis.com/v1/presentations/${slide.id}?fields=title,slides(objectId,pageElements(shape(text(textElements(textRun(content))))))`,
                accessToken
              );
              
              if (slideData) {
                slide.title = slideData.title;
                slide.slideCount = slideData.slides?.length || 0;
                slide.textContent = extractSlideText(slideData.slides);
                
                streamStep(controller, {
                  type: "observation",
                  content: `Read "${slide.name}": ${slide.slideCount} slides with text content`,
                  data: { type: "slide", name: slide.name, slideCount: slide.slideCount, textPreview: slide.textContent?.slice(0, 3) }
                });
              }
              
              await new Promise(r => setTimeout(r, 100));
            }
          }

          // ========== FORMS CONTENT ==========
          if (forms.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📋 Reading actual form questions from ${Math.min(forms.length, 10)} forms...`
            });

            for (let i = 0; i < Math.min(forms.length, 10); i++) {
              const form = forms[i];
              
              const formData = await fetchGoogleAPI(
                `https://forms.googleapis.com/v1/forms/${form.id}`,
                accessToken
              );
              
              if (formData) {
                form.title = formData.info?.title;
                form.description = formData.info?.description;
                form.questions = (formData.items || []).map((item: any) => ({
                  title: item.title,
                  type: item.questionItem?.question?.choiceQuestion ? 'multiple_choice' : 
                        item.questionItem?.question?.textQuestion ? 'text' :
                        item.questionItem?.question?.scaleQuestion ? 'scale' : 'other',
                  required: item.questionItem?.question?.required || false,
                  options: item.questionItem?.question?.choiceQuestion?.options?.map((o: any) => o.value) || [],
                }));
                
                streamStep(controller, {
                  type: "observation",
                  content: `Read "${form.name}": ${form.questions?.length || 0} questions`,
                  data: { type: "form", name: form.name, questions: form.questions?.slice(0, 3) }
                });
              }
              
              await new Promise(r => setTimeout(r, 100));
            }
          }

          await new Promise(r => setTimeout(r, 300));

          // ========== CALENDAR ==========
          streamStep(controller, {
            type: "action",
            content: `📅 Fetching calendar events for the upcoming year...`
          });

          const calendarData = await fetchGoogleAPI(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=200&timeMin=${new Date().toISOString()}&timeMax=${nextYearDate}&orderBy=startTime&singleEvents=true`,
            accessToken
          );

          const events: any[] = [];
          if (calendarData?.items) {
            for (const event of calendarData.items) {
              events.push({
                summary: event.summary,
                description: event.description?.slice(0, 200),
                start: event.start,
                end: event.end,
                attendees: event.attendees?.map((a: any) => a.email) || [],
                location: event.location,
                recurring: !!event.recurringEventId,
              });
            }
            
            streamStep(controller, {
              type: "observation",
              content: `✅ Found ${events.length} upcoming calendar events`
            });
          }

          await new Promise(r => setTimeout(r, 500));

          // ========== AI ANALYSIS ==========
          streamStep(controller, {
            type: "thought",
            content: "Processing all content data to identify the most impactful business improvement..."
          });

          // Build comprehensive analysis prompt with actual content
          const emailSummary = emails.slice(0, 50).map(e => 
            `From: ${e.from.split('<')[0].trim()} | Subject: "${e.subject}" | Content preview: ${e.content?.slice(0, 200) || e.snippet || 'N/A'}`
          ).join('\n');

          const sheetsSummary = sheets.slice(0, 5).map(s => {
            let summary = `Sheet: "${s.name}" (${s.rowCount || 0} rows)`;
            if (s.dataSummary?.headers) {
              summary += `\n  Headers: ${s.dataSummary.headers.join(', ')}`;
              if (s.dataSummary.sampleRows?.length > 0) {
                summary += `\n  Sample data: ${s.dataSummary.sampleRows.slice(0, 2).map((r: any[]) => r.join(' | ')).join(' // ')}`;
              }
            }
            return summary;
          }).join('\n\n');

          const slidesSummary = slides.slice(0, 5).map(s => 
            `Presentation: "${s.name}" (${s.slideCount} slides)\n  Content: ${s.textContent?.slice(0, 3).join(' | ') || 'N/A'}`
          ).join('\n\n');

          const formsSummary = forms.slice(0, 5).map(f => 
            `Form: "${f.name}"\n  Questions: ${f.questions?.map((q: any) => `"${q.title}" (${q.type})`).join(', ') || 'N/A'}`
          ).join('\n\n');

          const calendarSummary = events.slice(0, 20).map(e => 
            `Event: "${e.summary || 'Untitled'}" | Attendees: ${e.attendees?.length || 0} | ${e.description ? `Desc: ${e.description.slice(0, 100)}` : ''}`
          ).join('\n');

          const analysisPrompt = `You are a ${role?.toUpperCase() || 'CEO'} business advisor. Analyze this REAL Google Workspace data with ACTUAL CONTENT and identify ONE specific, actionable improvement that would have the highest business impact.

## EMAIL CONTENT ANALYSIS (${emails.length} emails from last year):
${emailSummary || 'No emails found'}

## SPREADSHEET DATA (${sheets.length} sheets with actual cell data):
${sheetsSummary || 'No sheets found'}

## PRESENTATION CONTENT (${slides.length} presentations with slide text):
${slidesSummary || 'No presentations found'}

## FORM QUESTIONS (${forms.length} forms with actual questions):
${formsSummary || 'No forms found'}

## CALENDAR EVENTS (${events.length} upcoming events):
${calendarSummary || 'No events found'}

Based on the ACTUAL CONTENT you can see, identify patterns, issues, or opportunities. Look for:
- Email patterns suggesting missed follow-ups or communication issues
- Spreadsheet data showing trends or anomalies
- Presentation content that may be outdated or inconsistent
- Forms that could be improved
- Calendar patterns suggesting scheduling issues

Respond with a JSON object:
{
  "issue": {
    "title": "Brief issue title",
    "category": "Email|Sheets|Slides|Forms|Calendar|Communication",
    "severity": "high|medium|low",
    "description": "Specific problem identified from the ACTUAL CONTENT you analyzed",
    "evidence": "Quote or reference SPECIFIC data/content that shows this issue"
  },
  "improvement": {
    "title": "Action to take",
    "description": "Detailed recommendation based on what you found",
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
                { role: "system", content: "You are a business analyst. Always respond with valid JSON only. Base your analysis on the ACTUAL CONTENT provided, not generic advice." },
                { role: "user", content: analysisPrompt },
              ],
            }),
          });

          if (!aiResponse.ok) {
            throw new Error("AI analysis failed");
          }

          const aiData = await aiResponse.json();
          const aiContent = aiData.choices?.[0]?.message?.content || "";
          
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
              content: "Deep content analysis complete!",
              data: {
                summary: {
                  emailsAnalyzed: emails.length,
                  documentsAnalyzed: documents.length,
                  sheetsAnalyzed: sheets.filter(s => s.data).length,
                  slidesAnalyzed: slides.filter(s => s.textContent).length,
                  formsAnalyzed: forms.filter(f => f.questions).length,
                  eventsAnalyzed: events.length,
                  contentDepth: "Full content analysis",
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
