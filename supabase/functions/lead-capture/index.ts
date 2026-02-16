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
    const { criteria, type, targetCount = 10 } = await req.json();

    if (!criteria || Object.keys(criteria).length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Criteria required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Lead capture request:", { criteria, type, targetCount });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const criteriaStr = Object.entries(criteria)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n- ");

    const searchPrompt = `You are a B2B lead research agent. Your task is to find REAL, VERIFIABLE companies and decision-makers matching an Ideal Customer Profile (ICP).

## IDEAL CUSTOMER PROFILE (ICP)
- ${criteriaStr}

## TARGET: Find ${Math.min(targetCount, 15)} qualified leads.

## YOUR PROCESS (follow strictly):

### STEP 1: FIND COMPANIES
- Search your knowledge for real companies matching the ICP criteria.
- Prioritize companies showing growth signals: recent funding rounds, active hiring, geographic expansion, new product launches, or partnerships.
- ONLY include companies you are HIGHLY CONFIDENT actually exist.

### STEP 2: FILTER AGAINST ICP
- For each company, verify it matches ALL provided ICP criteria (industry, size, geography).
- Skip any company that doesn't clearly fit.
- Never include duplicate companies.

### STEP 3: FIND DECISION MAKER
- For each qualifying company, identify 1-2 decision-makers whose titles match or are closest to the requested titles.
- Prioritize titles with budget authority (e.g., C-suite > VP > Director > Manager).
- Only provide names you are confident about from your training data.

### STEP 4: ENRICH DATA
For each lead, extract ALL of the following fields. If you cannot verify a field, use "Not found" — NEVER fabricate data.

## STRICT RULES:
1. ONLY return companies and people you are HIGHLY CONFIDENT exist.
2. NEVER fabricate company names, person names, emails, LinkedIn URLs, or any data.
3. If you don't know a field → "Not found"
4. For LinkedIn → Only provide if you're confident about the URL format (linkedin.com/in/firstname-lastname). Otherwise "Not found".
5. For email → Only provide if publicly known. Otherwise "Not found".
6. Company websites MUST be real domains you're confident about.
7. Quality over quantity — fewer verified leads are better than many fabricated ones.

## OUTPUT FORMAT:
Return ONLY a valid JSON array. No markdown, no explanation, no wrapping. Each object:
{
  "companyName": "string",
  "website": "string or Not found",
  "industry": "string",
  "sizeEstimate": "string (e.g. '50-200 employees', '$10M-$50M revenue')",
  "location": "string (city, country)",
  "decisionMakerName": "string or Not found",
  "title": "string (their job title)",
  "linkedIn": "string URL or Not found",
  "email": "string or Not found",
  "growthSignal": "string describing why this company is growing or Not found",
  "icpFitReason": "string explaining why this company matches the ICP"
}`;

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
            content: "You are a factual B2B lead research agent. You maintain an internal state of visited companies to avoid duplicates. You NEVER fabricate company names, people, contact details, or URLs. If you are not confident about any piece of data, you explicitly return 'Not found'. You prefer returning fewer verified results over many unverified ones. You always follow the structured research process: Find → Filter → Identify Decision Maker → Enrich."
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
        // Deduplicate by company name
        const seen = new Set();
        leads = leads.filter((l: any) => {
          const key = l.companyName?.toLowerCase().trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
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
