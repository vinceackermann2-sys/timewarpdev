 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
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
 
 // Send message back to Slack
 async function sendSlackMessage(channel: string, text: string, threadTs?: string) {
   const botToken = Deno.env.get("SLACK_BOT_TOKEN");
   if (!botToken) {
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
       Authorization: `Bearer ${botToken}`,
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
 
 // Call Research AI (non-streaming)
 async function callResearchAI(message: string): Promise<string> {
   const apiKey = Deno.env.get("LOVABLE_API_KEY");
   if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
 
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
 
 Provide helpful business research and analysis.`,
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
 async function callActionAI(message: string): Promise<string> {
   const apiKey = Deno.env.get("LOVABLE_API_KEY");
   if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
 
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
 
 Note: In Slack mode, you cannot directly create Google Docs/Sheets. Instead, provide the content directly so users can copy-paste or use the web app for full integration.`,
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
       console.log("Slack event received:", event.type);
 
       // Handle app mentions and direct messages
       if (event.type === "app_mention" || event.type === "message") {
         // Ignore bot messages to prevent loops
         if (event.bot_id || event.subtype === "bot_message") {
           return new Response("ok", { headers: corsHeaders });
         }
 
         const text = event.text || "";
         const channel = event.channel;
         const threadTs = event.thread_ts || event.ts;
 
         // Remove bot mention from text
         const cleanText = text.replace(/<@[A-Z0-9]+>/g, "").trim();
 
         if (!cleanText) {
           await sendSlackMessage(
             channel,
             "👋 Hi! I'm your AI assistant. Try:\n• `research: [your question]` - for business research & analysis\n• `action: [your request]` - for drafting content & taking action\n\nExample: `research: What are the key trends in AI?`",
             threadTs
           );
           return new Response("ok", { headers: corsHeaders });
         }
 
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
         await sendSlackMessage(channel, `🤔 ${mode === "research" ? "Researching" : "Working on it"}...`, threadTs);
 
         try {
           let response: string;
           if (mode === "research") {
             response = await callResearchAI(query);
           } else {
             response = await callActionAI(query);
           }
 
           // Truncate if too long for Slack
           if (response.length > 3000) {
             response = response.slice(0, 2900) + "\n\n_...response truncated. Use the web app for full features._";
           }
 
           await sendSlackMessage(channel, response, threadTs);
         } catch (error) {
           console.error("AI processing error:", error);
           await sendSlackMessage(
             channel,
             "❌ Sorry, I encountered an error processing your request. Please try again.",
             threadTs
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