import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnalyzeRequest {
  type: "text" | "image" | "document" | "website";
  content: {
    text?: string;
    imageBase64?: string;
    imageMimeType?: string;
    documentText?: string;
    documentName?: string;
    websiteUrl?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, content } = await req.json() as AnalyzeRequest;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messages: any[] = [];
    let systemPrompt = "";

    switch (type) {
      case "text": {
        systemPrompt = `You are a content analyst. Analyze the provided text and create a comprehensive summary that includes:
1. Main topics and themes
2. Key points and insights
3. Important entities (people, places, organizations)
4. Sentiment and tone
5. Action items or recommendations if applicable

Provide the analysis in a structured format that can be used to answer questions about this content.`;
        
        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this text:\n\n${content.text}` }
        ];
        break;
      }

      case "image": {
        systemPrompt = `You are an image analyst. Analyze the provided image and create a comprehensive description that includes:
1. What is shown in the image (objects, people, scenes)
2. Text visible in the image (OCR)
3. Colors, composition, and visual style
4. Context and meaning
5. Any data, charts, or diagrams if present

Provide detailed analysis that can be used to answer questions about this image.`;

        messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image in detail:" },
              {
                type: "image_url",
                image_url: {
                  url: `data:${content.imageMimeType};base64,${content.imageBase64}`
                }
              }
            ]
          }
        ];
        break;
      }

      case "document": {
        systemPrompt = `You are a document analyst. Analyze the provided document content and create a comprehensive summary that includes:
1. Document type and purpose
2. Main topics and sections
3. Key information and data points
4. Important findings or conclusions
5. Relevant dates, numbers, or metrics

Provide the analysis in a structured format that can be used to answer questions about this document.`;

        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this document (${content.documentName}):\n\n${content.documentText}` }
        ];
        break;
      }

      case "website": {
        // First, fetch the website content
        console.log("Fetching website:", content.websiteUrl);
        
        let websiteContent = "";
        let websiteTitle = "";
        
        try {
          const response = await fetch(content.websiteUrl!, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; Lovable/1.0; +https://lovable.dev)"
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            
            // Extract title
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            websiteTitle = titleMatch ? titleMatch[1].trim() : "";
            
            // Extract text content (basic HTML to text)
            websiteContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 15000); // Limit content size
          }
        } catch (fetchError) {
          console.error("Failed to fetch website:", fetchError);
          websiteContent = `Unable to fetch website content directly. URL: ${content.websiteUrl}`;
        }

        systemPrompt = `You are a website analyst. Analyze the provided website content and create a comprehensive summary that includes:
1. Website purpose and type
2. Main content and topics
3. Key information and offerings
4. Target audience
5. Notable features or services

Provide the analysis in a structured format that can be used to answer questions about this website.`;

        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this website (${content.websiteUrl}):\n\nTitle: ${websiteTitle}\n\nContent:\n${websiteContent}` }
        ];
        break;
      }
    }

    console.log(`Analyzing ${type} content...`);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to analyze content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "";

    console.log(`Analysis complete for ${type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        type 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analyze content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
