import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 2000) {
      return new Response(JSON.stringify({ error: "Prompt must be 3-2000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert at creating AI employee configurations for a business automation platform.

Given a user's description of a task they want automated, generate a complete employee profile with:
- A clear, professional name for this AI employee
- A concise role/title
- An SOP (Standard Operating Procedure) that will guide the employee to execute the task perfectly

The SOP should be thorough enough that when this employee is activated, it knows exactly what to do, how to do it, and what to watch out for.

Use the provided tool to return structured output.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create an AI employee for this task:\n\n${prompt.trim()}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_employee",
              description: "Create a structured AI employee profile from a task description",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Professional name for the AI employee (e.g. 'Content Strategist', 'Lead Qualifier')" },
                  role: { type: "string", description: "Concise role/title (e.g. 'Social Media Manager', 'Email Outreach Specialist')" },
                  sop_title: { type: "string", description: "Title of the Standard Operating Procedure" },
                  sop_purpose: { type: "string", description: "Why this employee exists and what outcome it delivers" },
                  sop_scope: { type: "string", description: "Boundaries of what this employee should and shouldn't do" },
                  sop_procedure: {
                    type: "array",
                    items: { type: "string" },
                    description: "Step-by-step procedure the employee follows (3-8 clear steps)",
                  },
                  sop_responsibilities: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key responsibilities and deliverables (2-5 items)",
                  },
                  sop_safety_notes: { type: "string", description: "Important warnings, constraints, or quality checks" },
                },
                required: ["name", "role", "sop_title", "sop_purpose", "sop_scope", "sop_procedure", "sop_responsibilities", "sop_safety_notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_employee" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Failed to generate employee profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const employee = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ employee }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-employee error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
