import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, content } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let userPrompt = "";
    let useMultimodal = false;
    let mediaUrl = "";

    switch (type) {
      case "text":
        userPrompt = `Analyze this text content and provide a structured summary with key insights, topics, and any actionable information:\n\n${content.text}`;
        break;

      case "document": {
        const name = content.documentName || "Unknown";
        if (content.documentText) {
          // Text-based document (TXT, CSV)
          userPrompt = `Analyze this document titled "${name}".\n\nContent:\n${content.documentText}\n\nProvide a structured summary including: document type, key topics, main findings, and actionable insights. Also extract and return the key text content.`;
        } else if (content.fileBase64) {
          // Binary document (PDF, DOCX, XLSX) - use multimodal
          useMultimodal = true;
          mediaUrl = `data:${content.fileMimeType || "application/pdf"};base64,${content.fileBase64}`;
          userPrompt = `Analyze this document titled "${name}" in detail. Extract ALL text content, identify the document type, key topics, main findings, tables, and actionable insights. Be thorough in extracting text - include all readable content from the document.`;
        } else {
          userPrompt = `Analyze a document titled "${name}". No content was provided. Return a note that the document could not be read.`;
        }
        break;
      }

      case "image":
        useMultimodal = true;
        if (content.imageBase64) {
          mediaUrl = `data:${content.imageMimeType || "image/png"};base64,${content.imageBase64}`;
        }
        userPrompt = `Analyze this image in detail. Describe what you see, extract any text (OCR), identify key elements, and provide relevant business insights.`;
        break;

      case "website":
        userPrompt = `Analyze the website at ${content.websiteUrl}.\n\nProvide a structured summary of what this website is about, its purpose, key information you can infer from the URL, and any relevant insights.`;
        break;

      default:
        throw new Error(`Unsupported content type: ${type}`);
    }

    const messages: any[] = [
      {
        role: "system",
        content:
          "You are a business data analyst. Analyze the provided content thoroughly and return a structured, scannable summary. Use bold headers, bullet points, and tables where appropriate. Focus on extracting actionable business insights. Keep your analysis concise but comprehensive. When analyzing documents or images, extract as much text content as possible.",
      },
    ];

    // Build the user message - multimodal for images and binary documents
    if (useMultimodal && mediaUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: mediaUrl } },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "No analysis generated.";

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-content error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
