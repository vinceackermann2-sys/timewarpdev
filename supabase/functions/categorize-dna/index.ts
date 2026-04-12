const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all user business data that is analyzed
    const { data: businessData, error: dbError } = await supabase
      .from('user_business_data')
      .select('id, title, content, analyzed_content, data_type, source, metadata')
      .eq('user_id', user.id)
      .eq('is_analyzed', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (dbError) {
      console.error("DB error occurred");
      return new Response(JSON.stringify({ error: "Failed to fetch data" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!businessData || businessData.length === 0) {
      return new Response(JSON.stringify({ success: true, segments: { problem: [], solution: [], customer: [], economics: [] } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build context from business data
    const dataContext = businessData.map((d, i) => {
      const text = d.analyzed_content || d.content || d.title;
      return `[${i + 1}] ID: ${d.id}\nTitle: ${d.title}\nSource: ${d.source}\nType: ${d.data_type}\nContent: ${(text || "").slice(0, 500)}`;
    }).join("\n\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `You are a business analyst. You categorize business information into 3 core pillars of a Business DNA Brain:

1. **brand** - Brand (Identity & Perception): Mission, vision, values, brand voice, visual identity, positioning, market perception, company culture, messaging, storytelling, reputation.
2. **product** - Product (What You Build & Deliver): Features, pricing, competitive advantages, user experience, product roadmap, value proposition, technology stack, customer feedback on product, use cases.
3. **sop** - SOP (Standard Operating Procedures): Processes, workflows, playbooks, team structures, operational guidelines, automation rules, quality standards, compliance, hiring procedures, internal documentation.

Analyze each piece of business data and categorize it into the MOST relevant pillar. Each data item belongs to ONE segment. Extract a concise insight (1-2 sentences) for each categorization.

Return ONLY valid JSON in this format:
{
  "categorizations": [
    { "data_id": "uuid-here", "segment": "brand", "insight": "Brief insight extracted" },
    { "data_id": "uuid-here", "segment": "product", "insight": "Brief insight extracted" }
  ]
}

Skip items that don't clearly fit any segment.`;

    const aiResponse = await fetch("https://ai.lovable.dev/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the business data to categorize:\n\n${dataContext}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI categorization error: status", aiResponse.status);
      return new Response(JSON.stringify({ error: "AI categorization failed" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      console.error("Failed to parse AI categorization response");
      return new Response(JSON.stringify({ error: "Failed to parse categorization" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Group by segment
    const segments: Record<string, Array<{ data_id: string; insight: string; title: string; source: string }>> = {
      brand: [], product: [], sop: []
    };

    const dataMap = new Map(businessData.map(d => [d.id, d]));
    
    for (const cat of (parsed.categorizations || [])) {
      if (segments[cat.segment] && dataMap.has(cat.data_id)) {
        const item = dataMap.get(cat.data_id)!;
        segments[cat.segment].push({
          data_id: cat.data_id,
          insight: cat.insight,
          title: item.title,
          source: item.source,
        });
      }
    }

    // Update metadata on categorized items
    for (const cat of (parsed.categorizations || [])) {
      if (dataMap.has(cat.data_id)) {
        const existing = dataMap.get(cat.data_id)!;
        const meta = (existing.metadata as any) || {};
        await supabase.from('user_business_data').update({
          metadata: { ...meta, dna_segment: cat.segment, dna_insight: cat.insight }
        }).eq('id', cat.data_id);
      }
    }

    return new Response(JSON.stringify({ success: true, segments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("categorize-dna error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
