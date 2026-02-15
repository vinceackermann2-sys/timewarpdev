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
    // type: "text" | "document" | "image" | "website"
    // content: { text?, url?, fileName?, mimeType?, extractedText? }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let userPrompt = "";

    switch (type) {
      case "text":
        userPrompt = `Analyze this text content and provide a structured summary with key insights, topics, and any actionable information:\n\n${content.text}`;
        break;

      case "document":
        userPrompt = `Analyze this document titled "${content.fileName || "Unknown"}".\n\nExtracted content:\n${content.extractedText || content.text || "No content extracted"}\n\nProvide a structured summary including: document type, key topics, main findings, and actionable insights.`;
        break;

      case "image":
        userPrompt = `Analyze this image. URL: ${content.url}\n\nDescribe what you see, extract any text (OCR), identify key elements, and provide relevant insights.`;
        break;

      case "website":
        userPrompt = `Analyze this website content from ${content.url}.\n\nPage title: ${content.title || "Unknown"}\n\nContent:\n${content.extractedText || "No content extracted"}\n\nProvide a structured summary of the website's purpose, key information, and relevant insights.`;
        break;

      default:
        throw new Error(`Unsupported content type: ${type}`);
    }

    const messages: any[] = [
      {
        role: "system",
        content:
          "You are a business data analyst. Analyze the provided content thoroughly and return a structured, scannable summary. Use bold headers, bullet points, and tables where appropriate. Focus on extracting actionable business insights. Keep your analysis concise but comprehensive.",
      },
      { role: "user", content: userPrompt },
    ];

    // For images, use multimodal if URL is provided
    if (type === "image" && content.url) {
      messages[1] = {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: content.url } },
        ],
      };
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
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

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
