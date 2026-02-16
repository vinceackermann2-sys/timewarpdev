const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadResult {
  companyName: string;
  website: string;
  ceoName: string;
  phoneNumber: string;
  country: string;
  market: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { criteria, type } = await req.json();

    if (!criteria || Object.keys(criteria).length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Criteria required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Lead capture request:", { criteria, type });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the search prompt
    const criteriaStr = Object.entries(criteria)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    const prompt = `You are a B2B lead generation expert. Based on these criteria: ${criteriaStr}

Find real companies that match. For each company, provide:
1. Company registered name (from their website or allabolag.se)
2. Company website URL
3. CEO/Managing Director full name (lookup on allabolag.se for Swedish companies)
4. CEO phone number (lookup on hitta.se)
5. Country
6. Market/Industry

Return EXACTLY a JSON array of objects with these fields: companyName, website, ceoName, phoneNumber, country, market.

Search thoroughly. Find 5-15 real, verifiable companies. Use real data from allabolag.se and hitta.se where applicable for Swedish companies. For non-Swedish companies, find the CEO info from public sources.

IMPORTANT: Return ONLY the JSON array, no other text. Example:
[{"companyName":"Example AB","website":"https://example.se","ceoName":"John Doe","phoneNumber":"+46701234567","country":"Sweden","market":"Technology"}]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a lead generation AI. Return only valid JSON arrays. No markdown, no explanation." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ success: false, error: "AI search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    console.log("AI response:", content.substring(0, 500));

    // Parse the JSON from the response
    let leads: LeadResult[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        leads = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error("Failed to parse leads:", parseErr);
      leads = [];
    }

    return new Response(
      JSON.stringify({ success: true, leads }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Lead capture error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
