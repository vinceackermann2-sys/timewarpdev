import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELS = [
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-3-pro-image-preview",
];

async function tryRemoveBg(apiKey: string, imageUrl: string, model: string): Promise<string | null> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Remove the background from this product image. Keep only the product itself on a pure white background. Make it clean and professional.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (response.status === 429) {
    console.warn(`Rate limited on model ${model}`);
    await response.text(); // consume body
    return null;
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(`AI gateway error (${model}):`, errText);
    return null;
  }

  const data = await response.json();
  // Check multiple possible response paths
  return (
    data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
    data.choices?.[0]?.message?.content?.[0]?.image_url?.url ||
    data.choices?.[0]?.message?.image?.url ||
    null
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try each model, with a delay between attempts for rate limits
    for (let i = 0; i < MODELS.length; i++) {
      const resultUrl = await tryRemoveBg(LOVABLE_API_KEY, imageUrl, MODELS[i]);
      if (resultUrl) {
        return new Response(
          JSON.stringify({ resultUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Wait before trying next model
      if (i < MODELS.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Final retry on first model after longer delay
    await new Promise(r => setTimeout(r, 3000));
    const lastTry = await tryRemoveBg(LOVABLE_API_KEY, imageUrl, MODELS[0]);
    if (lastTry) {
      return new Response(
        JSON.stringify({ resultUrl: lastTry }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Background removal failed after retries" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("remove-bg error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
