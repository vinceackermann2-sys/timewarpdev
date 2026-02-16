import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function updateBucketContext(supabaseAdmin: any, userId: string) {
  try {
    const { data: allData } = await supabaseAdmin
      .from("user_business_data")
      .select("data_type, source, title, content, analyzed_content, metadata, is_analyzed")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    const contextJson = JSON.stringify({
      updated_at: new Date().toISOString(),
      total: allData?.length || 0,
      items: (allData || []).map((item: any) => ({
        data_type: item.data_type,
        source: item.source,
        title: item.title,
        content: item.content || null,
        analyzed_content: item.analyzed_content || null,
        is_analyzed: item.is_analyzed,
        metadata: item.metadata || null,
      })),
    });

    await supabaseAdmin.storage
      .from("business-data")
      .upload(`${userId}/context.json`, new Blob([contextJson], { type: "application/json" }), {
        upsert: true,
        contentType: "application/json",
      });
  } catch (e) {
    console.error("Failed to update bucket context:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const { type, content } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get user for persisting results
    let userId: string | null = null;
    let supabaseAdmin: any = null;
    if (authHeader) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) userId = user.id;
    }

    let userPrompt = "";
    let useMultimodal = false;
    let mediaUrl = "";
    let dataTitle = "Untitled";
    let dataType = type;

    switch (type) {
      case "text":
        userPrompt = `Analyze this text content and provide a structured summary with key insights, topics, and any actionable information:\n\n${content.text}`;
        dataTitle = content.text?.slice(0, 80) || "Text content";
        break;

      case "document": {
        const name = content.documentName || "Unknown";
        dataTitle = name;
        if (content.documentText) {
          userPrompt = `Analyze this document titled "${name}".\n\nContent:\n${content.documentText}\n\nProvide a structured summary including: document type, key topics, main findings, and actionable insights.`;
        } else if (content.fileBase64) {
          useMultimodal = true;
          mediaUrl = `data:${content.fileMimeType || "application/pdf"};base64,${content.fileBase64}`;
          userPrompt = `Analyze this document titled "${name}" in detail. Extract ALL text content, identify the document type, key topics, main findings, tables, and actionable insights.`;
        } else {
          userPrompt = `Analyze a document titled "${name}". No content was provided.`;
        }
        break;
      }

      case "image":
        useMultimodal = true;
        dataTitle = content.imageName || "Image";
        if (content.imageBase64) {
          mediaUrl = `data:${content.imageMimeType || "image/png"};base64,${content.imageBase64}`;
        }
        userPrompt = `Analyze this image in detail. Describe what you see, extract any text (OCR), identify key elements, and provide relevant business insights.`;
        break;

      case "website": {
        dataTitle = content.websiteUrl || "Website";
        let websiteContent = "";
        try {
          const fetchRes = await fetch(content.websiteUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; TimeWarpBot/1.0)" },
            redirect: "follow",
          });
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            websiteContent = html
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 15000);
          }
        } catch (fetchErr) {
          console.error("Failed to fetch website:", fetchErr);
        }

        if (websiteContent) {
          userPrompt = `Analyze this website (${content.websiteUrl}).\n\nExtracted content:\n${websiteContent}\n\nProvide a structured summary including: what the website is about, key topics, main offerings/products, contact info if available, and actionable business insights.`;
        } else {
          userPrompt = `Analyze the website at ${content.websiteUrl}. I couldn't fetch its content directly.`;
        }
        break;
      }

      default:
        throw new Error(`Unsupported content type: ${type}`);
    }

    const messages: any[] = [
      {
        role: "system",
        content:
          "You are a business data analyst. Analyze the provided content thoroughly and return a structured, scannable summary. Use bold headers, bullet points, and tables where appropriate. Focus on extracting actionable business insights.",
      },
    ];

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
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "No analysis generated.";

    // Persist analyzed content to user_business_data and update bucket context
    if (userId && supabaseAdmin) {
      await supabaseAdmin.from("user_business_data").insert({
        user_id: userId,
        data_type: dataType,
        source: "canvas",
        title: dataTitle,
        content: content.text || content.documentText || content.websiteUrl || null,
        analyzed_content: analysis,
        is_analyzed: true,
        metadata: {
          ...(content.websiteUrl ? { url: content.websiteUrl } : {}),
          ...(content.documentName ? { fileName: content.documentName } : {}),
          ...(content.fileMimeType ? { mimeType: content.fileMimeType } : {}),
        },
      });

      // Refresh the consolidated bucket context
      await updateBucketContext(supabaseAdmin, userId);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-content error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
