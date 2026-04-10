import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import {
  shouldSearchConnections,
  extractQueryTopic,
  searchConnectedProviders,
} from "../_shared/run-employee/connections.ts";

import {
  extractLastUserMessage,
  buildVerifiedBusinessAnswer,
  loadBusinessIdentity,
  retrieveRelevantContext,
} from "../_shared/run-employee/rag.ts";

import {
  buildBrowserSystemPrompt,
  buildEmployeeChatPrompt,
} from "../_shared/run-employee/prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =====================================================
// MIDDLEWARE GUARDRAILS
// =====================================================

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /disregard\s+(your|all|the)\s+/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /system\s*:\s*you\s+are/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  /new\s+instructions?\s*:/i,
  /override\s+(your|system|all)\s+/i,
];

const PII_PATTERNS = [
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, label: "credit card number" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, label: "SSN" },
];

const OUTPUT_BLOCKLIST = [
  /here\s+(?:is|are)\s+(?:your|the|my)\s+(?:credit\s+card|ssn|social\s+security|password)/i,
  /\bDROP\s+TABLE\b/i,
  /\bDELETE\s+FROM\s+/i,
  /\bsudo\s+rm\b/i,
];

const BLOCKED_URL_PATTERNS = [
  /checkout/i, /payment/i, /billing/i,
  /signin|sign-in|login|log-in/i,
  /signup|sign-up|register/i,
];

const BLOCKED_SELECTOR_PATTERNS = [
  /sign.?up|register|create.?account/i,
  /log.?in|sign.?in/i,
  /pay|purchase|buy|checkout|place.?order|subscribe/i,
];

function runPreflightGuardrails(userMessage: string, safety: any): string | null {
  if (!userMessage || !safety) return null;
  if (safety.promptInjectionEnabled) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(userMessage)) {
        return "⚠️ Your message was blocked by the **Prompt Injection Defense** guardrail.";
      }
    }
  }
  if (safety.integrityEnabled !== false) {
    for (const { pattern, label } of PII_PATTERNS) {
      if (pattern.test(userMessage)) {
        return `⚠️ Your message was blocked by the **Integrity** guardrail. It appears to contain a ${label}.`;
      }
    }
  }
  return null;
}

function runPostflightGuardrails(content: string, safety: any): string {
  if (!content || !safety) return content;
  if (safety.integrityEnabled !== false) {
    for (const pattern of OUTPUT_BLOCKLIST) {
      if (pattern.test(content)) {
        return "⚠️ The AI response was blocked by the **Integrity** guardrail because it contained potentially unsafe content.";
      }
    }
  }
  if (safety.moderationCategories) {
    const activeCategories = Object.entries(safety.moderationCategories)
      .filter(([_, v]: [string, any]) => v.enabled && v.level === "High")
      .map(([cat]: [string, any]) => cat.toLowerCase());
    if (activeCategories.length > 0) {
      const lower = content.toLowerCase();
      for (const cat of activeCategories) {
        const keywords = cat.split(/\s+/);
        if (keywords.every(kw => lower.includes(kw))) {
          return `⚠️ The AI response was blocked by the **Content Moderation** guardrail (category: ${cat}).`;
        }
      }
    }
  }
  return content;
}

function validateBrowserActions(content: string, safety: any): string | null {
  if (!safety || safety.integrityEnabled === false) return null;
  try {
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) return null;
    const action = JSON.parse(jsonMatch[1]);

    if (action.action === "navigate" && action.url) {
      for (const pattern of BLOCKED_URL_PATTERNS) {
        if (pattern.test(action.url)) {
          return "```json\n" + JSON.stringify({ action: "respond", message: `⚠️ Navigation to "${action.url}" was blocked by the **Integrity** guardrail.`, reasoning: "Safety guardrail", done: false }) + "\n```";
        }
      }
    }
    if (action.action === "click" && action.selector) {
      for (const pattern of BLOCKED_SELECTOR_PATTERNS) {
        if (pattern.test(action.selector)) {
          return "```json\n" + JSON.stringify({ action: "respond", message: `⚠️ Clicking "${action.selector}" was blocked.`, reasoning: "Safety guardrail", done: false }) + "\n```";
        }
      }
    }
    if (action.action === "type" && action.selector && /password|passwd|secret|card.?number|cvv|cvc|ssn/i.test(action.selector)) {
      return "```json\n" + JSON.stringify({ action: "respond", message: `⚠️ Typing into "${action.selector}" was blocked.`, reasoning: "Safety guardrail", done: false }) + "\n```";
    }
  } catch {}
  return null;
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { employee_id, messages, pageContext, skip_action, brandId, workspaceId, continuationContent, connectionQuery } = await req.json();
    if (!employee_id) throw new Error("employee_id required");

    // Load employee
    const { data: employee, error: empError } = await supabase
      .from("ai_employees")
      .select("*")
      .eq("id", employee_id)
      .single();

    if (empError || !employee) throw new Error("Employee not found");

    // Verify ownership or workspace membership
    const isOwner = employee.user_id === user.id;
    let isMember = false;
    if (!isOwner && employee.workspace_id) {
      const { data: memberCheck } = await supabase.rpc("is_workspace_member", {
        _user_id: user.id,
        _workspace_id: employee.workspace_id,
      });
      isMember = !!memberCheck;
    }
    if (!isOwner && !isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment action usage
    if (!skip_action) {
      const { data: usageResult } = await supabase.rpc("increment_actions_used", { _user_id: user.id });
      if (usageResult && !usageResult.allowed) {
        return new Response(JSON.stringify({ error: usageResult.reason || "Action limit reached" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const effectiveBrandId = brandId || employee.linked_business_id;
    const { identity, safetySettings } = await loadBusinessIdentity(supabase, { ...employee, linked_business_id: effectiveBrandId });

    const lastUserMsg = extractLastUserMessage(messages);
    const connectionLookupQuery = typeof connectionQuery === "string" && connectionQuery.trim().length > 0
      ? connectionQuery.trim()
      : lastUserMsg;

    const preflightBlock = runPreflightGuardrails(lastUserMsg, safetySettings);
    if (preflightBlock) {
      return new Response(JSON.stringify({ content: preflightBlock }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isBrowserMode = !!pageContext;

    // Check for verified business answers but serve through SSE pipeline
    let preVerifiedContent: string | null = null;
    if (!isBrowserMode) {
      const verifiedContent = await buildVerifiedBusinessAnswer(supabase, {
        ...employee,
        workspace_id: workspaceId || employee.workspace_id,
        linked_business_id: effectiveBrandId,
      }, lastUserMsg);
      if (verifiedContent) {
        preVerifiedContent = runPostflightGuardrails(verifiedContent, safetySettings);
      }
    }

    const effectiveWsId = workspaceId || employee.workspace_id;
    let effectiveMessages = [...(messages || [])];
    if (continuationContent) {
      effectiveMessages.push({ role: "assistant", content: continuationContent });
      effectiveMessages.push({ role: "user", content: "Continue exactly where you left off. Do not repeat what you already wrote." });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const buildAiResponse = async (
      relevantContext: string,
      connectionContext: string,
      emitContent?: (delta: string) => void,
    ) => {
      const fullContext = relevantContext + connectionContext;
      const systemPrompt = isBrowserMode
        ? buildBrowserSystemPrompt(employee, identity, fullContext, pageContext, safetySettings)
        : buildEmployeeChatPrompt(employee, identity, fullContext, safetySettings);

      const TIMEOUT_MS = 45_000;
      const startTime = Date.now();
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
            ...effectiveMessages,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const errorBody = await response.text().catch(() => "");
        console.error("AI gateway error:", status, errorBody.slice(0, 200));
        if (status === 429) throw new Error("Rate limit exceeded.");
        if (status === 402) throw new Error("AI credits exhausted.");
        throw new Error("AI service unavailable");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let timedOut = false;
      let streamDone = false;

      try {
        while (true) {
          if (Date.now() - startTime > TIMEOUT_MS) { timedOut = true; break; }
          const { done, value } = await reader.read();
          if (done) { streamDone = true; break; }
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") { streamDone = true; break; }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) { fullContent += delta; emitContent?.(delta); }
            } catch {}
          }
          if (streamDone) break;
        }
      } finally {
        try { reader.cancel(); } catch {}
      }

      let content = (continuationContent || "") + fullContent;
      content = runPostflightGuardrails(content, safetySettings);
      if (isBrowserMode) {
        const actionBlock = validateBrowserActions(content, safetySettings);
        if (actionBlock) content = actionBlock;
      }

      return { content, continuation: timedOut && content.length > 0 };
    };

    if (isBrowserMode) {
      const relevantContext = await retrieveRelevantContext(supabase, {
        ...employee,
        workspace_id: effectiveWsId,
        linked_business_id: effectiveBrandId,
      }, lastUserMsg);
      const { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision, queryTopic } = await searchConnectedProviders(supabase, user.id, connectionLookupQuery);
      const result = await buildAiResponse(relevantContext, connectionContext);
      return new Response(JSON.stringify({ ...result, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision, queryTopic }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        const sendStep = (label: string, status: "running" | "done" | "error", action = "process", detail?: string) => {
          send({ type: "progress", step: { label, status, action, detail } });
        };
        const close = () => {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        };

        (async () => {
          try {
            const topic = extractQueryTopic(connectionLookupQuery);
            sendStep(`Understanding your question about ${topic}`, "running", "analysis");
            const decision = shouldSearchConnections(connectionLookupQuery);
            sendStep(`Understanding your question about ${topic}`, "done", "analysis", decision.reason);

            sendStep(`Gathering business data on ${topic}`, "running", "context");
            const relevantContext = await retrieveRelevantContext(supabase, {
              ...employee,
              workspace_id: effectiveWsId,
              linked_business_id: effectiveBrandId,
            }, lastUserMsg);
            sendStep(`Gathered business data on ${topic}`, "done", "context");

            const { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision, queryTopic } = await searchConnectedProviders(
              supabase,
              user.id,
              connectionLookupQuery,
              (step) => send({ type: "progress", step }),
              topic,
            );

            let result: { content: string; continuation?: boolean };

            if (preVerifiedContent) {
              sendStep(`Verified business data for ${topic}`, "running", "response");
              send({ type: "content", delta: preVerifiedContent });
              result = { content: preVerifiedContent, continuation: false };
              sendStep(`Verified business data for ${topic}`, "done", "response");
            } else {
              sendStep(`Crafting your answer on ${topic}`, "running", "response");
              result = await buildAiResponse(relevantContext, connectionContext, (delta) => {
                send({ type: "content", delta });
              });
              sendStep(`Crafting your answer on ${topic}`, "done", "response");
            }
            if (!result.continuation) sendStep("Finished", "done", "complete");

            send({ type: "result", ...result, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision, queryTopic });
            close();
          } catch (error: any) {
            console.error("run-employee stream error:", error?.message || error);
            send({ type: "error", error: error?.message || "An internal error occurred" });
            close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e: any) {
    console.error("run-employee error:", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
