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

    const searchPrompt = `You are an elite B2B lead research agent. Your task is to find REAL, VERIFIABLE companies and decision-makers matching an Ideal Customer Profile (ICP).

## IDEAL CUSTOMER PROFILE (ICP)
- ${criteriaStr}

## TARGET: Find ${Math.min(targetCount, 15)} qualified leads.

## STATE MANAGEMENT RULES:
- Maintain an internal Visited Companies list — NEVER research the same company twice.
- NEVER output duplicate leads.
- Track which companies you've evaluated and rejected.

---

## STEP 1 — FIND COMPANIES

Search your knowledge using signals from:
- LinkedIn company data
- Business directories (e.g. allabolag.se for Swedish companies, Companies House for UK, etc.)
- Crunchbase-style funding data (recent funding rounds, investors)
- Job board signals (companies actively hiring = growth indicator)
- Company websites and press releases
- Industry-specific directories

**Prioritize companies that:**
- Recently raised funding (Series A, B, C, seed, etc.)
- Are actively hiring (especially in sales, marketing, or product roles)
- Show clear growth indicators (revenue growth, expansion, new offices, product launches, partnerships)
- Match the ICP industry and size EXACTLY

---

## STEP 2 — FILTER AGAINST ICP

For each candidate company:
- Verify it matches ALL provided ICP criteria (industry, size, geography).
- Skip any company that doesn't clearly fit.
- Mark company as Visited — never revisit.

---

## STEP 3 — FIND DECISION MAKERS

For each qualifying company, identify 1–3 relevant decision-makers.

**Prioritize these titles (in order):**
1. CEO / Founder / Co-Founder
2. CMO / Chief Marketing Officer
3. Head of Marketing / Head of Growth
4. COO (if the offer is operational)
5. VP of Sales / VP of Marketing
6. Director-level roles

**Rules:**
- Avoid generic roles (e.g. "Manager") unless the company is very small (<10 employees).
- Only provide names you are confident about from your training data.
- Prioritize titles closest to budget authority.

---

## STEP 4 — EXTRACT & ENRICH DATA

For each lead, extract ALL fields below. If you cannot verify a field, use "Not found" — NEVER FABRICATE DATA.

---

## STEP 5 — QUALIFY LEAD

Score each lead 1–5 based on:
- **5** = Perfect ICP match + strong growth signal (funding, hiring, expansion)
- **4** = Strong ICP match, some growth indicators
- **3** = Acceptable match but not ideal (partial criteria fit)
- **2** = Weak match (missing key criteria)
- **1** = Poor fit (included only if target count not met)

Only include leads scored 3 or above unless you cannot find enough.

---

## STRICT RULES:
1. ONLY return companies and people you are HIGHLY CONFIDENT actually exist.
2. NEVER fabricate company names, person names, emails, LinkedIn URLs, or any data.
3. If you don't know a field → "Not found"
4. For LinkedIn → Only provide if you're confident about the URL (linkedin.com/in/firstname-lastname format). Otherwise "Not found".
5. For email → Only provide if publicly known or confidently inferrable from company domain + name pattern. Set confidence accordingly.
6. Company websites MUST be real domains you're confident about.
7. Quality over quantity — fewer verified leads beat many fabricated ones.
8. For Swedish companies, use the legal entity name with "AB" suffix.

## OUTPUT FORMAT:
Return ONLY a valid JSON array. No markdown, no explanation, no wrapping. Each object:
{
  "companyName": "string",
  "website": "string or Not found",
  "industry": "string",
  "sizeEstimate": "string (e.g. '50-200 employees')",
  "location": "string (city, country)",
  "decisionMakerName": "string or Not found",
  "title": "string (their job title)",
  "linkedIn": "string URL or Not found",
  "email": "string or Not found",
  "emailConfidence": "High | Medium | Low | N/A",
  "growthSignal": "string describing why this company is growing, or Not found",
  "icpFitReason": "string explaining why this company matches the ICP",
  "leadScore": 5
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
            content: "You are an elite B2B lead research agent with deep knowledge of business directories, funding databases, and professional networks. You maintain strict internal state management: a Visited Companies set and a Lead Database to avoid any duplicates. You NEVER fabricate company names, people, contact details, or URLs. If you are not confident about any piece of data, you return 'Not found'. You always follow the 5-step structured research process: Find → Filter → Identify Decision Makers → Enrich → Qualify. You score every lead 1-5 and only include leads scored 3+."
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
        // Sort by leadScore descending
        leads.sort((a: any, b: any) => (b.leadScore || 0) - (a.leadScore || 0));
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
