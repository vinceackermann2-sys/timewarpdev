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

// Helper to get top email contacts
function getTopContacts(emails: any[]): { email: string; count: number }[] {
  const contactCounts: Record<string, number> = {};
  for (const email of emails) {
    const from = email.from?.match(/<(.+)>/)?.[1] || email.from?.trim();
    if (from) {
      contactCounts[from] = (contactCounts[from] || 0) + 1;
    }
  }
  return Object.entries(contactCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([email, count]) => ({ email, count }));
}

// Helper to get sample sheet data
function getSampleSheetData(allData: any): any {
  if (!allData) return {};
  const sample: any = {};
  for (const [tabName, tabData] of Object.entries(allData)) {
    const data = tabData as any;
    if (data?.values) {
      sample[tabName] = {
        headers: data.values[0]?.slice(0, 8),
        sampleRows: data.values.slice(1, 4).map((r: any[]) => r?.slice(0, 8)),
        rowCount: data.rowCount,
        columnCount: data.columnCount
      };
    }
  }
  return sample;
}

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
  
  return content.slice(0, 3000);
}

// Extract attachments from email
function extractEmailAttachments(payload: any, messageId: string): any[] {
  const attachments: any[] = [];
  
  function processPartForAttachments(part: any) {
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      const mimeType = part.mimeType || '';
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');
      
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
        messageId,
        isImage,
        isVideo,
      });
    }
    
    if (part.parts) {
      for (const subPart of part.parts) {
        processPartForAttachments(subPart);
      }
    }
  }
  
  processPartForAttachments(payload);
  return attachments;
}

// Extract text and images from slides
function extractSlideContent(slides: any[]): { texts: string[], images: any[] } {
  const texts: string[] = [];
  const images: any[] = [];
  
  for (let i = 0; i < (slides || []).length; i++) {
    const slide = slides[i];
    let slideText = "";
    
    for (const element of slide.pageElements || []) {
      // Extract text
      if (element.shape?.text?.textElements) {
        for (const te of element.shape.text.textElements) {
          if (te.textRun?.content) {
            slideText += te.textRun.content + " ";
          }
        }
      }
      
      // Extract images
      if (element.image?.contentUrl) {
        images.push({
          slideNumber: i + 1,
          contentUrl: element.image.contentUrl,
          sourceUrl: element.image.sourceUrl,
        });
      }
    }
    
    if (slideText.trim()) {
      texts.push(`Slide ${i + 1}: ${slideText.trim().slice(0, 500)}`);
    }
  }
  
  return { texts, images };
}

// Analyze an image using AI vision
async function analyzeImage(imageUrl: string, context: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Briefly describe this image in a business context. Context: ${context}. Describe in 1-2 sentences what the image shows and any business relevance.`
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });
    
    if (!response.ok) return "Could not analyze image";
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Image analysis unavailable";
  } catch (e) {
    console.error("Image analysis error:", e);
    return "Image analysis failed";
  }
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
    const { accessToken, role = 'ceo', mode = 'research', includeUploadedFiles } = body;
    
    const isResearchMode = mode === 'research';
    const roleLabel = role?.toUpperCase() || 'CEO';
    
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
          // ========== UPLOADED FILES (if any) ==========
          let uploadedFilesData: any[] = [];
          
          if (includeUploadedFiles) {
            streamStep(controller, {
              type: "action",
              content: `📄 Loading uploaded documents from your business data...`
            });
            
            const supabaseServiceRole = createClient(
              supabaseUrl, 
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );
            
            const { data: filesData } = await supabaseServiceRole.storage
              .from('business-data')
              .download(`${userId}/uploaded-files.json`);
            
            if (filesData) {
              try {
                const text = await filesData.text();
                uploadedFilesData = JSON.parse(text);
                
                streamStep(controller, {
                  type: "observation",
                  content: `Found ${uploadedFilesData.length} uploaded file(s) to include in analysis.`
                });
              } catch {
                uploadedFilesData = [];
              }
            }
          }

          const modeDescription = isResearchMode 
            ? "identify inefficiencies, problems, and improvement opportunities" 
            : "find immediate actionable tasks I can execute right now";
          
          streamStep(controller, {
            type: "thought",
            content: `${roleLabel} ${isResearchMode ? 'Research' : 'Action'} mode: I'll scan up to 1000 emails (with attachments), full spreadsheet data, slide images/text, form content, video files${uploadedFilesData.length > 0 ? `, plus ${uploadedFilesData.length} uploaded document(s)` : ''} to ${modeDescription}...`
          });

          await new Promise(r => setTimeout(r, 500));

          // ========== EMAILS WITH ATTACHMENTS ==========
          streamStep(controller, {
            type: "action",
            content: `📧 Fetching up to 1000 emails with full content and attachments...`
          });

          const emailQuery = encodeURIComponent(`after:${lastYearDate}`);
          let allEmailIds: string[] = [];
          let nextPageToken: string | undefined;
          
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
            content: `Found ${allEmailIds.length} emails. Fetching content and detecting attachments...`
          });

          const emails: any[] = [];
          const allEmailAttachments: any[] = [];
          const emailBatchSize = 50;
          
          for (let batch = 0; batch < Math.ceil(Math.min(allEmailIds.length, 1000) / emailBatchSize); batch++) {
            const batchIds = allEmailIds.slice(batch * emailBatchSize, (batch + 1) * emailBatchSize);
            
            const batchPromises = batchIds.map(async (msgId) => {
              const detail = await fetchGoogleAPI(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
                accessToken
              );
              
              if (detail) {
                const headers = detail.payload?.headers || [];
                const content = extractEmailContent(detail.payload);
                const attachments = extractEmailAttachments(detail.payload, msgId);
                
                allEmailAttachments.push(...attachments);
                
                return {
                  id: msgId,
                  subject: headers.find((h: any) => h.name === "Subject")?.value || "(No subject)",
                  from: headers.find((h: any) => h.name === "From")?.value || "Unknown",
                  to: headers.find((h: any) => h.name === "To")?.value || "",
                  date: headers.find((h: any) => h.name === "Date")?.value,
                  content: content.slice(0, 1500),
                  snippet: detail.snippet,
                  labels: detail.labelIds || [],
                  attachmentCount: attachments.length,
                  hasImages: attachments.some((a: any) => a.isImage),
                  hasVideos: attachments.some((a: any) => a.isVideo),
                };
              }
              return null;
            });
            
            const batchResults = await Promise.all(batchPromises);
            emails.push(...batchResults.filter(Boolean));
            
            if (batch % 3 === 0) {
              streamStep(controller, {
                type: "observation",
                content: `Processed ${emails.length}/${Math.min(allEmailIds.length, 1000)} emails...`
              });
            }
          }

          const imageAttachments = allEmailAttachments.filter(a => a.isImage);
          const videoAttachments = allEmailAttachments.filter(a => a.isVideo);

          streamStep(controller, {
            type: "observation",
            content: `✅ Analyzed ${emails.length} emails. Found ${imageAttachments.length} image attachments and ${videoAttachments.length} video attachments.`
          });

          // Analyze a few email image attachments
          const analyzedEmailImages: any[] = [];
          if (imageAttachments.length > 0 && LOVABLE_API_KEY) {
            streamStep(controller, {
              type: "action",
              content: `🖼️ Analyzing ${Math.min(imageAttachments.length, 5)} image attachments from emails...`
            });

            for (const attachment of imageAttachments.slice(0, 5)) {
              // Fetch attachment data
              const attachmentData = await fetchGoogleAPI(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${attachment.messageId}/attachments/${attachment.attachmentId}`,
                accessToken
              );
              
              if (attachmentData?.data) {
                const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
                const imageUrl = `data:${attachment.mimeType};base64,${base64Data}`;
                
                const analysis = await analyzeImage(imageUrl, `Email attachment: ${attachment.filename}`, LOVABLE_API_KEY);
                analyzedEmailImages.push({
                  filename: attachment.filename,
                  analysis,
                });
                
                streamStep(controller, {
                  type: "observation",
                  content: `Analyzed image "${attachment.filename}": ${analysis.slice(0, 100)}...`,
                  data: { type: "email_image", filename: attachment.filename }
                });
              }
            }
          }

          await new Promise(r => setTimeout(r, 300));

          // ========== DRIVE FILES (including images/videos) ==========
          streamStep(controller, {
            type: "action",
            content: `📁 Scanning Google Drive for all file types including images and videos...`
          });

          const driveQuery = encodeURIComponent(`modifiedTime > '${lastYearDate}T00:00:00'`);
          const driveData = await fetchGoogleAPI(
            `https://www.googleapis.com/drive/v3/files?pageSize=500&q=${driveQuery}&fields=files(id,name,mimeType,modifiedTime,shared,webViewLink,size,thumbnailLink,webContentLink)&orderBy=modifiedTime desc`,
            accessToken
          );

          const documents: any[] = [];
          const sheets: any[] = [];
          const slides: any[] = [];
          const forms: any[] = [];
          const driveImages: any[] = [];
          const driveVideos: any[] = [];

          if (driveData?.files) {
            for (const file of driveData.files) {
              const fileInfo = {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                modifiedTime: file.modifiedTime,
                shared: file.shared,
                size: file.size,
                thumbnailLink: file.thumbnailLink,
                webContentLink: file.webContentLink,
              };

              if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
                sheets.push(fileInfo);
              } else if (file.mimeType === 'application/vnd.google-apps.presentation') {
                slides.push(fileInfo);
              } else if (file.mimeType === 'application/vnd.google-apps.form') {
                forms.push(fileInfo);
              } else if (file.mimeType?.startsWith('image/')) {
                driveImages.push(fileInfo);
              } else if (file.mimeType?.startsWith('video/')) {
                driveVideos.push(fileInfo);
              } else if (
                file.mimeType === 'application/pdf' ||
                file.mimeType === 'application/vnd.google-apps.document' ||
                file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.mimeType === 'application/msword' ||
                file.mimeType === 'text/plain'
              ) {
                documents.push(fileInfo);
              } else {
                // Other file types - skip
              }
            }

            streamStep(controller, {
              type: "observation",
              content: `Found: ${documents.length} docs/PDFs, ${sheets.length} sheets, ${slides.length} slides, ${forms.length} forms, ${driveImages.length} images, ${driveVideos.length} videos`
            });
          }

          // ========== ANALYZE DOCUMENTS (PDFs, Docs) ==========
          const analyzedDocuments: any[] = [];
          if (documents.length > 0 && LOVABLE_API_KEY) {
            streamStep(controller, {
              type: "action",
              content: `📄 Analyzing content from ${Math.min(documents.length, 15)} documents and PDFs...`
            });

            for (const doc of documents.slice(0, 15)) {
              try {
                let content = "";
                let analysisResult = "";

                // For Google Docs, export as plain text
                if (doc.mimeType === 'application/vnd.google-apps.document') {
                  const textData = await fetchGoogleAPI(
                    `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/plain`,
                    accessToken
                  );
                  if (textData) {
                    content = typeof textData === 'string' ? textData : JSON.stringify(textData);
                    content = content.slice(0, 5000);
                  }
                } 
                // For PDFs, download and use AI vision
                else if (doc.mimeType === 'application/pdf') {
                  // Get the file content
                  const fileResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                  );
                  
                  if (fileResponse.ok) {
                    const arrayBuffer = await fileResponse.arrayBuffer();
                    const bytes = new Uint8Array(arrayBuffer);
                    
                    // Only process PDFs under 5MB
                    if (bytes.length < 5 * 1024 * 1024) {
                      let binary = "";
                      for (let i = 0; i < bytes.length; i++) {
                        binary += String.fromCharCode(bytes[i]);
                      }
                      const base64Data = btoa(binary);
                      
                      // Use AI to extract PDF content
                      const pdfResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${LOVABLE_API_KEY}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          model: "google/gemini-2.5-flash",
                          messages: [{
                            role: "user",
                            content: [
                              {
                                type: "text",
                                text: `Extract and summarize the key business information from this PDF document "${doc.name}". Focus on: key data points, names, dates, amounts, decisions, action items. Be concise but thorough.`
                              },
                              {
                                type: "image_url",
                                image_url: { url: `data:application/pdf;base64,${base64Data}` }
                              }
                            ]
                          }],
                        }),
                      });
                      
                      if (pdfResponse.ok) {
                        const pdfData = await pdfResponse.json();
                        analysisResult = pdfData.choices?.[0]?.message?.content || "";
                      }
                    }
                  }
                }
                // For other text-based documents
                else if (doc.mimeType === 'text/plain') {
                  const textResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                  );
                  if (textResponse.ok) {
                    content = await textResponse.text();
                    content = content.slice(0, 5000);
                  }
                }

                if (content || analysisResult) {
                  analyzedDocuments.push({
                    name: doc.name,
                    mimeType: doc.mimeType,
                    content: content.slice(0, 2000),
                    analysis: analysisResult.slice(0, 1500),
                    modifiedTime: doc.modifiedTime,
                  });

                  streamStep(controller, {
                    type: "observation",
                    content: `Analyzed "${doc.name}": ${(analysisResult || content).slice(0, 80)}...`,
                    data: { type: "document", name: doc.name }
                  });
                }
              } catch (e) {
                console.error(`Failed to analyze document ${doc.name}:`, e);
              }
            }
            
            streamStep(controller, {
              type: "observation",
              content: `✅ Extracted content from ${analyzedDocuments.length} documents/PDFs`
            });
          }

          // Analyze Drive images
          const analyzedDriveImages: any[] = [];
          if (driveImages.length > 0 && LOVABLE_API_KEY) {
            streamStep(controller, {
              type: "action",
              content: `🖼️ Analyzing ${Math.min(driveImages.length, 10)} images from Google Drive...`
            });

            for (const image of driveImages.slice(0, 10)) {
              if (image.thumbnailLink) {
                const analysis = await analyzeImage(image.thumbnailLink, `Drive file: ${image.name}`, LOVABLE_API_KEY);
                analyzedDriveImages.push({
                  name: image.name,
                  analysis,
                });
                
                streamStep(controller, {
                  type: "observation",
                  content: `Analyzed "${image.name}": ${analysis.slice(0, 80)}...`,
                  data: { type: "drive_image", name: image.name }
                });
              }
            }
          }

          await new Promise(r => setTimeout(r, 300));

          // ========== FULL SPREADSHEET DATA ==========
          if (sheets.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📊 Reading COMPLETE spreadsheet data from ${Math.min(sheets.length, 10)} sheets...`
            });

            for (let i = 0; i < Math.min(sheets.length, 10); i++) {
              const sheet = sheets[i];
              
              const sheetMeta = await fetchGoogleAPI(
                `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}?fields=properties.title,sheets.properties`,
                accessToken
              );
              
              if (sheetMeta) {
                sheet.title = sheetMeta.properties?.title;
                sheet.sheetNames = sheetMeta.sheets?.map((s: any) => s.properties?.title) || [];
                sheet.allData = {};
                
                // Fetch ALL data from each sheet tab
                for (const tabName of sheet.sheetNames.slice(0, 5)) { // First 5 tabs
                  const dataResponse = await fetchGoogleAPI(
                    `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/${encodeURIComponent(tabName)}`,
                    accessToken
                  );
                  
                  if (dataResponse?.values) {
                    sheet.allData[tabName] = {
                      values: dataResponse.values,
                      rowCount: dataResponse.values.length,
                      columnCount: Math.max(...dataResponse.values.map((r: any[]) => r?.length || 0)),
                    };
                  }
                }
                
                const totalRows = Object.values(sheet.allData).reduce((sum: number, tab: any) => sum + (tab?.rowCount || 0), 0);
                
                streamStep(controller, {
                  type: "observation",
                  content: `Read "${sheet.name}": ${totalRows} total rows across ${Object.keys(sheet.allData).length} tabs`,
                  data: { type: "sheet", name: sheet.name, totalRows }
                });
              }
              
              await new Promise(r => setTimeout(r, 100));
            }
          }

          // ========== SLIDES WITH IMAGES ==========
          const analyzedSlideImages: any[] = [];
          if (slides.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📽️ Reading slide content and analyzing embedded images from ${Math.min(slides.length, 10)} presentations...`
            });

            for (let i = 0; i < Math.min(slides.length, 10); i++) {
              const slide = slides[i];
              
              const slideData = await fetchGoogleAPI(
                `https://slides.googleapis.com/v1/presentations/${slide.id}`,
                accessToken
              );
              
              if (slideData) {
                slide.title = slideData.title;
                slide.slideCount = slideData.slides?.length || 0;
                
                const { texts, images } = extractSlideContent(slideData.slides);
                slide.textContent = texts;
                slide.imageCount = images.length;
                
                // Analyze slide images
                for (const img of images.slice(0, 3)) {
                  if (img.contentUrl && LOVABLE_API_KEY) {
                    const analysis = await analyzeImage(img.contentUrl, `Slide ${img.slideNumber} in "${slide.name}"`, LOVABLE_API_KEY);
                    analyzedSlideImages.push({
                      presentation: slide.name,
                      slideNumber: img.slideNumber,
                      analysis,
                    });
                  }
                }
                
                streamStep(controller, {
                  type: "observation",
                  content: `Read "${slide.name}": ${slide.slideCount} slides, ${slide.imageCount} images analyzed`,
                  data: { type: "slide", name: slide.name, slideCount: slide.slideCount, imageCount: slide.imageCount }
                });
              }
              
              await new Promise(r => setTimeout(r, 100));
            }
          }

          // ========== FORMS CONTENT ==========
          if (forms.length > 0) {
            streamStep(controller, {
              type: "action",
              content: `📋 Reading full form content from ${Math.min(forms.length, 10)} forms...`
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
                  description: item.description,
                  type: item.questionItem?.question?.choiceQuestion ? 'multiple_choice' : 
                        item.questionItem?.question?.textQuestion ? 'text' :
                        item.questionItem?.question?.scaleQuestion ? 'scale' :
                        item.questionItem?.question?.dateQuestion ? 'date' :
                        item.questionItem?.question?.timeQuestion ? 'time' : 'other',
                  required: item.questionItem?.question?.required || false,
                  options: item.questionItem?.question?.choiceQuestion?.options?.map((o: any) => o.value) || [],
                  hasImage: !!item.questionItem?.image,
                }));
                
                streamStep(controller, {
                  type: "observation",
                  content: `Read "${form.name}": ${form.questions?.length || 0} questions`,
                  data: { type: "form", name: form.name, questionCount: form.questions?.length }
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
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=250&timeMin=${new Date().toISOString()}&timeMax=${nextYearDate}&orderBy=startTime&singleEvents=true`,
            accessToken
          );

          const events: any[] = [];
          if (calendarData?.items) {
            for (const event of calendarData.items) {
              events.push({
                summary: event.summary,
                description: event.description?.slice(0, 300),
                start: event.start,
                end: event.end,
                attendees: event.attendees?.map((a: any) => a.email) || [],
                location: event.location,
                recurring: !!event.recurringEventId,
                hasAttachments: (event.attachments?.length || 0) > 0,
              });
            }
            
            streamStep(controller, {
              type: "observation",
              content: `✅ Found ${events.length} upcoming calendar events`
            });
          }

          await new Promise(r => setTimeout(r, 500));

          // ========== COMPREHENSIVE AI ANALYSIS ==========
          streamStep(controller, {
            type: "thought",
            content: "Processing all content including images and videos to find the most impactful improvement..."
          });

          // Build comprehensive analysis with all data
          const emailSummary = emails.slice(0, 40).map(e => 
            `From: ${e.from.split('<')[0].trim()} | Subject: "${e.subject}" | Attachments: ${e.attachmentCount} (${e.hasImages ? 'has images' : ''}${e.hasVideos ? ', has videos' : ''}) | Content: ${e.content?.slice(0, 300) || e.snippet || 'N/A'}`
          ).join('\n');

          const sheetsSummary = sheets.slice(0, 5).map(s => {
            let summary = `Sheet: "${s.name}"`;
            for (const [tabName, tabData] of Object.entries(s.allData || {})) {
              const data = tabData as any;
              if (data?.values) {
                const headers = data.values[0] || [];
                const sampleRows = data.values.slice(1, 4);
                summary += `\n  Tab "${tabName}" (${data.rowCount} rows, ${data.columnCount} cols):`;
                summary += `\n    Headers: ${headers.slice(0, 10).join(', ')}`;
                summary += `\n    Sample: ${sampleRows.slice(0, 2).map((r: any[]) => r.slice(0, 5).join(' | ')).join(' // ')}`;
              }
            }
            return summary;
          }).join('\n\n');

          const slidesSummary = slides.slice(0, 5).map(s => 
            `Presentation: "${s.name}" (${s.slideCount} slides, ${s.imageCount || 0} images)\n  Content: ${s.textContent?.slice(0, 3).join(' | ') || 'N/A'}`
          ).join('\n\n');

          const formsSummary = forms.slice(0, 5).map(f => 
            `Form: "${f.name}" (${f.questions?.length || 0} questions)\n  Questions: ${f.questions?.map((q: any) => `"${q.title}" [${q.type}]${q.hasImage ? ' 🖼️' : ''}`).join(', ') || 'N/A'}`
          ).join('\n\n');

          const imageSummary = [
            ...analyzedEmailImages.map(i => `Email attachment "${i.filename}": ${i.analysis}`),
            ...analyzedDriveImages.map(i => `Drive file "${i.name}": ${i.analysis}`),
            ...analyzedSlideImages.map(i => `${i.presentation} slide ${i.slideNumber}: ${i.analysis}`),
          ].join('\n');

          const videoSummary = [
            ...videoAttachments.map(v => `Email video: ${v.filename} (${Math.round((v.size || 0) / 1024 / 1024)}MB)`),
            ...driveVideos.map(v => `Drive video: ${v.name} (${Math.round((v.size || 0) / 1024 / 1024)}MB)`),
          ].join('\n');

          const calendarSummary = events.slice(0, 25).map(e => 
            `Event: "${e.summary || 'Untitled'}" | Attendees: ${e.attendees?.length || 0} | Location: ${e.location || 'N/A'}`
          ).join('\n');

          // Build analyzed documents summary (from Google Drive)
          const documentsSummary = analyzedDocuments.length > 0
            ? analyzedDocuments.map(d => 
                `Document: "${d.name}"\n${d.analysis ? `Analysis: ${d.analysis.slice(0, 800)}` : `Content: ${d.content?.slice(0, 800) || 'N/A'}`}`
              ).join('\n\n')
            : '';

          // Build uploaded files summary
          const uploadedFilesSummary = uploadedFilesData.length > 0 
            ? uploadedFilesData.map(f => 
                `File: "${f.fileName}" (${f.mimeType})\nSummary: ${f.summary || 'N/A'}\nContent: ${f.extractedText?.slice(0, 1000) || 'N/A'}`
              ).join('\n\n')
            : '';

          const analysisPrompt = `You are a ${role?.toUpperCase() || 'CEO'} business advisor. Analyze this COMPREHENSIVE Google Workspace data including FULL content from emails, documents, PDFs, spreadsheets, images, and videos. Identify ONE specific, actionable improvement with the highest business impact.

## EMAIL ANALYSIS (${emails.length} emails, ${imageAttachments.length} image attachments, ${videoAttachments.length} videos):
${emailSummary || 'No emails found'}

## DOCUMENTS & PDFs ANALYZED (${analyzedDocuments.length} files with extracted content):
${documentsSummary || 'No documents analyzed'}

## IMAGE ANALYSIS (AI-analyzed images):
${imageSummary || 'No images analyzed'}

## VIDEO FILES DETECTED:
${videoSummary || 'No videos found'}

## FULL SPREADSHEET DATA (${sheets.length} spreadsheets with complete content):
${sheetsSummary || 'No sheets found'}

## PRESENTATION CONTENT (${slides.length} presentations with text and images):
${slidesSummary || 'No presentations found'}

## FORM QUESTIONS (${forms.length} forms):
${formsSummary || 'No forms found'}

## CALENDAR (${events.length} upcoming events):
${calendarSummary || 'No events found'}

${uploadedFilesData.length > 0 ? `## MANUALLY UPLOADED FILES (${uploadedFilesData.length} files):
${uploadedFilesSummary}
` : ''}
Based on the ACTUAL CONTENT from PDFs, documents, images, videos, and all other files, identify patterns, issues, or opportunities. Look for:
- Document content revealing contracts, agreements, or important business data
- PDF reports containing metrics, financials, or operational data
- Email patterns and attachment trends
- Image content that reveals business operations or issues
- Spreadsheet data showing trends or anomalies
- Presentation content quality and consistency

Respond with a JSON object:
{
  "issue": {
    "title": "Brief issue title",
    "category": "Email|Images|Videos|Sheets|Slides|Forms|Calendar${uploadedFilesData.length > 0 ? '|Documents' : ''}",
    "severity": "high|medium|low",
    "description": "Specific problem identified from the ACTUAL CONTENT including visual analysis",
    "evidence": "Quote or reference SPECIFIC data/content/images that shows this issue"
  },
  "improvement": {
    "title": "Action to take",
    "description": "Detailed recommendation based on all analyzed content",
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
                { role: "system", content: `You are a ${roleLabel} ${isResearchMode ? 'business analyst' : 'executive assistant'}. Always respond with valid JSON only. Base your analysis on the ACTUAL CONTENT including image descriptions and video information provided.` },
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

          // Build research summary to save
          const researchSummary = {
            emailsAnalyzed: emails.length,
            emailAttachments: allEmailAttachments.length,
            imageAttachmentsAnalyzed: analyzedEmailImages.length,
            videoAttachments: videoAttachments.length,
            documentsAnalyzed: documents.length,
            documentContentExtracted: analyzedDocuments.length,
            sheetsAnalyzed: sheets.length,
            slidesAnalyzed: slides.length,
            formsAnalyzed: forms.length,
            driveImagesAnalyzed: analyzedDriveImages.length,
            driveVideos: driveVideos.length,
            eventsAnalyzed: events.length,
            uploadedFilesAnalyzed: uploadedFilesData.length,
            analysisMode: mode,
            analyzedAt: new Date().toISOString(),
            timeRange: {
              emails: `Last year (since ${lastYearDate})`,
              files: `Last year (since ${lastYearDate})`,
              calendar: `Upcoming year (until ${nextYearDate.split('T')[0]})`
            }
          };

          // Build raw data for chat context (summarized versions)
          const rawData = {
            emailSummaries: emails.slice(0, 100).map(e => ({
              from: e.from?.split('<')[0]?.trim() || 'Unknown',
              subject: e.subject,
              date: e.date,
              snippet: e.snippet,
              hasAttachments: e.attachmentCount > 0
            })),
            topContacts: getTopContacts(emails),
            calendarEvents: events.slice(0, 50).map(e => ({
              summary: e.summary,
              start: e.start,
              attendees: e.attendees?.length || 0,
              location: e.location
            })),
            documents: documents.slice(0, 30).map(d => ({ name: d.name, modifiedTime: d.modifiedTime })),
            analyzedDocuments: analyzedDocuments.slice(0, 15).map(d => ({
              name: d.name,
              mimeType: d.mimeType,
              content: d.content?.slice(0, 1500) || d.analysis?.slice(0, 1500),
              modifiedTime: d.modifiedTime
            })),
            sheets: sheets.slice(0, 10).map(s => ({
              name: s.name,
              title: s.title,
              sheetNames: s.sheetNames,
              sampleData: getSampleSheetData(s.allData)
            })),
            slides: slides.slice(0, 10).map(s => ({
              name: s.name,
              title: s.title,
              slideCount: s.slideCount,
              textSummary: s.textContent?.slice(0, 3)?.join(' | ')
            })),
            forms: forms.slice(0, 10).map(f => ({
              name: f.name,
              title: f.title,
              questionCount: f.questions?.length
            })),
            analyzedImages: [
              ...analyzedEmailImages,
              ...analyzedDriveImages.slice(0, 5),
              ...analyzedSlideImages.slice(0, 5)
            ],
            uploadedFiles: uploadedFilesData.map(f => ({
              fileName: f.fileName,
              mimeType: f.mimeType,
              summary: f.summary,
              extractedText: f.extractedText?.slice(0, 2000)
            }))
          };

          const findings = analysis?.issue && analysis?.improvement ? [analysis] : [];

          // Save research to storage bucket using service role
          const supabaseServiceRole = createClient(
            supabaseUrl, 
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );

          // Create research JSON to save to bucket
          const researchData = {
            summary: researchSummary,
            findings: findings,
            rawData: rawData,
            role: role || 'ceo',
            createdAt: new Date().toISOString()
          };

          // Upload to storage bucket
          const { error: uploadError } = await supabaseServiceRole.storage
            .from('business-data')
            .upload(
              `${userId}/research.json`,
              JSON.stringify(researchData),
              {
                contentType: 'application/json',
                upsert: true
              }
            );

          if (uploadError) {
            console.error('Failed to save research to bucket:', uploadError);
          } else {
            console.log('Research saved to bucket for user:', userId);
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
              content: "Comprehensive content analysis complete!",
              data: {
                summary: researchSummary,
                ...analysis
              }
            });
          } else {
            streamStep(controller, {
              type: "complete",
              content: "Analysis complete!",
              data: {
                summary: researchSummary
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
