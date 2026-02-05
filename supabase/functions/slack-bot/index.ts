 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp",
 };
 
 // Verify Slack request signature
 async function verifySlackSignature(req: Request, body: string): Promise<boolean> {
   const signingSecret = Deno.env.get("SLACK_SIGNING_SECRET");
   if (!signingSecret) {
     console.error("SLACK_SIGNING_SECRET not configured");
     return false;
   }
 
   const timestamp = req.headers.get("x-slack-request-timestamp");
   const slackSignature = req.headers.get("x-slack-signature");
 
   if (!timestamp || !slackSignature) {
     console.error("Missing Slack headers");
     return false;
   }
 
   // Check timestamp to prevent replay attacks (5 min window)
   const now = Math.floor(Date.now() / 1000);
   if (Math.abs(now - parseInt(timestamp)) > 300) {
     console.error("Request timestamp too old");
     return false;
   }
 
   const sigBasestring = `v0:${timestamp}:${body}`;
   const encoder = new TextEncoder();
   const key = await crypto.subtle.importKey(
     "raw",
     encoder.encode(signingSecret),
     { name: "HMAC", hash: "SHA-256" },
     false,
     ["sign"]
   );
   const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(sigBasestring));
   const hashHex = Array.from(new Uint8Array(signature))
     .map(b => b.toString(16).padStart(2, "0"))
     .join("");
   const computedSignature = `v0=${hashHex}`;
 
   return computedSignature === slackSignature;
 }
 
 // Generate a random 6-digit code
 function generateLinkCode(): string {
   return Math.floor(100000 + Math.random() * 900000).toString();
 }
 
 // Store for pending link codes (in production, use Redis or database)
 const pendingLinks = new Map<string, { code: string; email: string; expiresAt: number }>();
 
 // Send message back to Slack
 async function sendSlackMessage(channel: string, text: string, threadTs?: string, botToken?: string) {
   const token = botToken || Deno.env.get("SLACK_BOT_TOKEN");
   if (!token) {
     console.error("SLACK_BOT_TOKEN not configured");
     return;
   }
 
   const payload: any = {
     channel,
     text,
     mrkdwn: true,
   };
 
   if (threadTs) {
     payload.thread_ts = threadTs;
   }
 
   const response = await fetch("https://slack.com/api/chat.postMessage", {
     method: "POST",
     headers: {
       Authorization: `Bearer ${token}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify(payload),
   });
 
   const result = await response.json();
   if (!result.ok) {
     console.error("Slack API error:", result.error);
   }
   return result;
 }
 
 // Get bot token for a workspace
 async function getBotTokenForTeam(teamId: string): Promise<string | null> {
   const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
   const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const supabase = createClient(supabaseUrl, supabaseKey);
 
   const { data } = await supabase
     .from("slack_installations")
     .select("bot_token")
     .eq("team_id", teamId)
     .single();
 
   if (data?.bot_token) {
     return data.bot_token;
   }
 
   // Fallback to env var for backwards compatibility
   return Deno.env.get("SLACK_BOT_TOKEN") || null;
 }
 
 // Get user's business data from database
 async function getUserBusinessData(userId: string): Promise<string> {
   const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
   const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const supabase = createClient(supabaseUrl, supabaseKey);
 
   const { data: research } = await supabase
     .from("workspace_research")
     .select("*")
     .eq("user_id", userId)
     .order("updated_at", { ascending: false })
     .limit(1)
     .single();
 
   if (!research) return "";
 
   let context = "";
   const rawData = research.raw_data || {};
   const findings = research.findings || [];
   const summary = research.research_summary || {};
 
   context += `## Business Data Summary\n`;
   context += `${summary.summary || summary.overallHealth || "No summary available"}\n\n`;
 
   if (findings.length > 0) {
     context += `## Key Findings (${findings.length} total)\n`;
     context += findings.slice(0, 5).map((f: any, i: number) =>
       `${i + 1}. [${f.impact?.toUpperCase() || "INFO"}] ${f.category || "General"}: ${f.finding || JSON.stringify(f)}`
     ).join("\n") + "\n\n";
   }
 
   if (rawData.topContacts?.length) {
     context += `## Top Contacts\n`;
     context += rawData.topContacts.slice(0, 5).map((c: any) => `- ${c.email} (${c.count} interactions)`).join("\n") + "\n\n";
   }
 
  // Handle both legacy format (emailSummaries) and new format (emails from sync-research)
  const emails = rawData.emails || rawData.emailSummaries || [];
  if (emails.length > 0) {
    context += `## Recent Emails (${emails.length} total)\n`;
    context += emails.slice(0, 10).map((e: any) => `- "${e.subject}" from ${e.from}`).join("\n") + "\n\n";
  }
 
   if (rawData.calendarEvents?.length) {
    context += `## Calendar Events (${rawData.calendarEvents.length} total)\n`;
    context += rawData.calendarEvents.slice(0, 10).map((e: any) => `- ${e.summary} (${e.start?.dateTime || e.start})`).join("\n") + "\n\n";
  }

  // Handle documents from sync-research
  const documents = rawData.documents || [];
  if (documents.length > 0) {
    context += `## Documents (${documents.length} total)\n`;
    context += documents.slice(0, 10).map((d: any) => `- ${d.name} (modified: ${d.modifiedTime})`).join("\n") + "\n\n";
  }

  // Handle spreadsheets from sync-research
  const spreadsheets = rawData.spreadsheets || [];
  if (spreadsheets.length > 0) {
    context += `## Spreadsheets (${spreadsheets.length} total)\n`;
    context += spreadsheets.slice(0, 5).map((s: any) => `- ${s.name}`).join("\n") + "\n\n";
   }
 
   return context;
 }
 
 // Check if Slack user is linked
 async function getLinkedUserId(slackUserId: string, slackTeamId: string): Promise<string | null> {
   const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
   const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const supabase = createClient(supabaseUrl, supabaseKey);
 
   const { data } = await supabase
     .from("slack_user_links")
     .select("user_id")
     .eq("slack_user_id", slackUserId)
     .eq("slack_team_id", slackTeamId)
     .single();
 
   return data?.user_id || null;
 }
 
 // Link Slack user to app user
 async function linkSlackUser(slackUserId: string, slackTeamId: string, email: string): Promise<{ success: boolean; error?: string }> {
   const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
   const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const supabase = createClient(supabaseUrl, supabaseKey);
 
   // Find user by email
   const { data: users } = await supabase.auth.admin.listUsers();
   const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
 
   if (!user) {
     return { success: false, error: "No TimeWarp account found with that email. Please sign up at the app first." };
   }
 
   // Create or update link
   const { error } = await supabase
     .from("slack_user_links")
     .upsert({
       user_id: user.id,
       slack_user_id: slackUserId,
       slack_team_id: slackTeamId,
       linked_at: new Date().toISOString()
     }, { onConflict: "slack_user_id,slack_team_id" });
 
   if (error) {
     console.error("Link error:", error);
     return { success: false, error: "Failed to link account. Please try again." };
   }
 
   return { success: true };
 }
 
 // Call Research AI (non-streaming)
 async function callResearchAI(message: string, businessContext: string): Promise<string> {
   const apiKey = Deno.env.get("LOVABLE_API_KEY");
   if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
 
   const contextSection = businessContext
     ? `\n\n## User's Business Data\n${businessContext}\n\nUse this data to provide personalized, relevant answers.`
     : "\n\nNote: User hasn't connected their business data yet. Provide general answers.";
 
   const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
     method: "POST",
     headers: {
       Authorization: `Bearer ${apiKey}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       model: "google/gemini-3-flash-preview",
       messages: [
         {
           role: "system",
           content: `You are a business intelligence research assistant responding via Slack.
 
 ## Response Format for Slack
 - Use *bold* for emphasis (Slack markdown)
 - Use \`code\` for technical terms
 - Use bullet points with • or -
 - Keep responses concise (max 2000 chars for Slack)
 - Be direct and actionable
 - Don't use [INSIGHT:] or [SUGGEST:] format - just plain Slack-friendly text
 ${contextSection}
 
 Provide helpful, personalized business research and analysis based on the user's data when available.`,
         },
         { role: "user", content: message },
       ],
       stream: false,
     }),
   });
 
   if (!response.ok) {
     const error = await response.text();
     console.error("AI error:", error);
     throw new Error("Failed to get AI response");
   }
 
   const result = await response.json();
   return result.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
 }
 
 // Call Action AI (non-streaming) 
 async function callActionAI(message: string, businessContext: string): Promise<string> {
   const apiKey = Deno.env.get("LOVABLE_API_KEY");
   if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
 
   const contextSection = businessContext
     ? `\n\n## User's Business Data\n${businessContext}\n\nUse this data to create personalized content.`
     : "\n\nNote: User hasn't connected their business data yet. Provide general content.";
 
   const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
     method: "POST",
     headers: {
       Authorization: `Bearer ${apiKey}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       model: "google/gemini-3-flash-preview",
       messages: [
         {
           role: "system",
           content: `You are an action-oriented business assistant responding via Slack.
 
 ## Your Role
 - Help draft emails, documents, and content
 - Provide templates and frameworks
 - Give actionable recommendations
 - Help with task planning and prioritization
 
 ## Response Format for Slack
 - Use *bold* for emphasis (Slack markdown)
 - Use \`code\` for technical terms
 - Use bullet points with • or -
 - Keep responses concise (max 2000 chars for Slack)
 - Be direct and provide ready-to-use content
 - Don't use [STEP:] or [DOC:] format - just plain Slack-friendly text
 ${contextSection}
 
 In Slack mode, provide ready-to-use content that users can copy-paste. Reference their specific contacts, emails, and data when available.`,
         },
         { role: "user", content: message },
       ],
       stream: false,
     }),
   });
 
   if (!response.ok) {
     const error = await response.text();
     console.error("AI error:", error);
     throw new Error("Failed to get AI response");
   }
 
   const result = await response.json();
   return result.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
 }
 
 serve(async (req) => {
   // Handle CORS
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const bodyText = await req.text();
     
     // Verify Slack signature (skip for URL verification challenge)
     const body = JSON.parse(bodyText);
     
     // Handle Slack URL verification challenge
     if (body.type === "url_verification") {
       console.log("Slack URL verification challenge received");
       return new Response(JSON.stringify({ challenge: body.challenge }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Verify signature for all other requests
     const isValid = await verifySlackSignature(req, bodyText);
     if (!isValid) {
       console.error("Invalid Slack signature");
       return new Response("Unauthorized", { status: 401 });
     }
 
     // Handle event callbacks
     if (body.type === "event_callback") {
       const event = body.event;
       console.log("Slack event received:", event.type, "subtype:", event.subtype, "thread_ts:", event.thread_ts, "channel_type:", event.channel_type);
 
       // Handle app mentions and direct messages
       if (event.type === "app_mention" || event.type === "message") {
         // Ignore bot messages to prevent loops
         if (event.bot_id || event.subtype === "bot_message" || event.subtype === "message_changed") {
           return new Response("ok", { headers: corsHeaders });
         }
         
         // For channel messages (not DMs, not mentions), only respond in threads where bot is participating
         if (event.type === "message" && event.channel_type === "channel" && !event.thread_ts) {
           // Top-level channel message without @mention - ignore
           return new Response("ok", { headers: corsHeaders });
         }
 
         const text = event.text || "";
         const channel = event.channel;
         const threadTs = event.thread_ts || event.ts;
         const slackUserId = event.user;
         const slackTeamId = body.team_id;
 
         // Get bot token for this workspace
         const botToken = await getBotTokenForTeam(slackTeamId);
         console.log("Bot token lookup for team:", slackTeamId, "found:", !!botToken);
         if (!botToken) {
           console.error("No bot token found for team:", slackTeamId);
           return new Response("ok", { headers: corsHeaders });
         }
 
         // Remove bot mention from text
         const cleanText = text.replace(/<@[A-Z0-9]+>/gi, "").trim();
         console.log("Processing message - cleanText:", cleanText);
 
         if (!cleanText) {
           await sendSlackMessage(
             channel,
             "👋 Hi! I'm your AI assistant.\n\n*Getting Started:*\n• `link [your-email]` - Connect your TimeWarp account for personalized answers\n\n*Commands:*\n• `research: [question]` - Business research & analysis\n• `action: [request]` - Draft content & take action\n• `status` - Check your account link status\n\nExample: `link john@company.com`",
             threadTs,
             botToken
           );
           return new Response("ok", { headers: corsHeaders });
         }
 
         // Handle link command
          // Handle both plain email and Slack mailto format: <mailto:email@test.com|email@test.com>
          const linkMatch = cleanText.match(/^link\s+(?:<mailto:([^|>]+)\|[^>]+>|([^\s<>]+@[^\s<>]+))/i);
         if (linkMatch) {
            // Extract email from either capture group (mailto format or plain)
            const email = (linkMatch[1] || linkMatch[2]).replace(/[<>.,!?;:]+$/, "").trim();
           console.log("Link attempt - Slack user:", slackUserId, "Team:", slackTeamId, "Email:", email);
           
           const result = await linkSlackUser(slackUserId, slackTeamId, email);
           
           if (result.success) {
             await sendSlackMessage(
               channel,
               `✅ *Account linked successfully!*\n\nYour Slack is now connected to ${email}. I'll use your business data to give personalized answers.\n\nTry: \`research: What are my top priorities this week?\``,
               threadTs,
               botToken
             );
           } else {
             await sendSlackMessage(channel, `❌ ${result.error}`, threadTs, botToken);
           }
           return new Response("ok", { headers: corsHeaders });
         }
 
         // Handle status command
         if (cleanText.toLowerCase() === "status") {
           const linkedUserId = await getLinkedUserId(slackUserId, slackTeamId);
           if (linkedUserId) {
             await sendSlackMessage(
               channel,
               "✅ *Account linked!* Your Slack is connected to your TimeWarp account. I'm using your business data for personalized answers.",
               threadTs,
               botToken
             );
           } else {
             await sendSlackMessage(
               channel,
               "⚠️ *Not linked yet.* Use `link [your-email]` to connect your TimeWarp account for personalized answers.",
               threadTs,
               botToken
             );
           }
           return new Response("ok", { headers: corsHeaders });
         }
 
         // Check if user is linked and get their business data
         const linkedUserId = await getLinkedUserId(slackUserId, slackTeamId);
         let businessContext = "";
         
         // Require linking before using AI features
         if (!linkedUserId) {
           await sendSlackMessage(
             channel,
             `🔐 *Account connection required*\n\nTo use the AI assistant, please link your TimeWarp account first:\n\n\`link your-email@company.com\`\n\nThis connects your business data (emails, calendar, documents) so I can give you personalized answers.\n\n_Don't have an account yet? Sign up at the TimeWarp app first._`,
             threadTs,
             botToken
           );
           return new Response("ok", { headers: corsHeaders });
         }
 
         // User is linked - get their business data
         businessContext = await getUserBusinessData(linkedUserId);
 
         // Detect mode from message
         const lowerText = cleanText.toLowerCase();
         let mode: "research" | "action" | "auto" = "auto";
         let query = cleanText;
 
         if (lowerText.startsWith("research:")) {
           mode = "research";
           query = cleanText.slice(9).trim();
         } else if (lowerText.startsWith("action:")) {
           mode = "action";
           query = cleanText.slice(7).trim();
         } else {
           // Auto-detect based on keywords
           const actionKeywords = /\b(draft|write|create|send|email|document|schedule|make|prepare|build)\b/i;
           mode = actionKeywords.test(cleanText) ? "action" : "research";
         }
 
         // Send typing indicator
         await sendSlackMessage(channel, `🤔 ${mode === "research" ? "Researching" : "Working on it"} using your business data...`, threadTs, botToken);
 
         try {
           let response: string;
           if (mode === "research") {
             response = await callResearchAI(query, businessContext);
           } else {
             response = await callActionAI(query, businessContext);
           }
 
           // Truncate if too long for Slack
           if (response.length > 3000) {
             response = response.slice(0, 2900) + "\n\n_...response truncated. Use the web app for full features._";
           }
 
           await sendSlackMessage(channel, response, threadTs, botToken);
         } catch (error) {
           console.error("AI processing error:", error);
           await sendSlackMessage(
             channel,
             "❌ Sorry, I encountered an error processing your request. Please try again.",
             threadTs,
             botToken
           );
         }
       }
     }
 
     return new Response("ok", { headers: corsHeaders });
   } catch (error) {
     console.error("Slack bot error:", error);
     return new Response(JSON.stringify({ error: "Internal error" }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });