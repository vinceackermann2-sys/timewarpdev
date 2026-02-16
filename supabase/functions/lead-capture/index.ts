const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const criteriaStr = Object.entries(criteria)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    // Step 1: Find real companies matching criteria using grounded search
    const searchPrompt = `You are a B2B lead research assistant. Your job is to find REAL, VERIFIABLE companies.

SEARCH CRITERIA: ${criteriaStr}

STRICT RULES:
1. ONLY return companies you are HIGHLY CONFIDENT actually exist based on your training data.
2. For Swedish companies: use the legal entity name ending in "AB" (Aktiebolag). This is the registered trademark name you'd find on allabolag.se.
3. For CEO/Managing Director: Only provide the name if you are confident about it from your training data. If you looked up this company on allabolag.se, who would be listed as VD (CEO)?
4. For phone numbers: Only provide if you are confident. Otherwise use "Not found - check hitta.se for [CEO name]".
5. NEVER FABRICATE OR GUESS:
   - If you don't know the CEO → put "Not found - verify on allabolag.se"
   - If you don't know the phone → put "Not found - verify on hitta.se"  
   - If you're unsure about the website → put "Not verified"
6. Company websites MUST be real domains you're confident about.
7. Return 5-10 companies maximum. Quality over quantity.

VERIFICATION MINDSET:
- Think: "If someone went to allabolag.se and searched for this company name, would they find it?"
- Think: "If someone went to this website URL, would it load?"
- Think: "If someone searched hitta.se for this person's name, would they find them?"

Return ONLY a JSON array. No markdown, no explanation. Each object must have:
- companyName: Legal registered name (with AB for Swedish companies)
- website: Company website URL (or "Not verified")
- ceoName: CEO/VD full name (or "Not found - verify on allabolag.se")
- phoneNumber: Phone number (or "Not found - verify on hitta.se for [name]")
- country: Country
- market: Industry/market

Example:
[{"companyName":"Spotify AB","website":"https://spotify.com","ceoName":"Daniel Ek","phoneNumber":"Not found - verify on hitta.se for Daniel Ek","country":"Sweden","market":"Music Technology"}]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: "You are a factual business research assistant. You NEVER fabricate company names, people, or contact details. If you are not confident about a piece of data, you explicitly say 'Not found' with instructions on where to verify. You prefer returning fewer verified results over many unverified ones."
          },
          { role: "user", content: searchPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "AI search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    console.log("AI response:", content.substring(0, 500));

    let leads = [];
    try {
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
