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
import {
  buildBusinessBrainContext,
  logBusinessLearningEvent,
} from "../_shared/run-employee/business-brain.ts";

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

function extractJsonCodeBlock(content: string): string | null {
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch?.[1]) return jsonMatch[1];
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateSingleAction(action: unknown): { valid: boolean; reason?: string; actionObj?: Record<string, unknown> } {
  if (!isObject(action)) return { valid: false, reason: "Action must be a JSON object." };
  const actionType = typeof action.action === "string" ? action.action : "";
  if (!actionType) return { valid: false, reason: "Missing required field: action." };
  if (typeof action.reasoning !== "string" || action.reasoning.trim().length === 0) {
    return { valid: false, reason: "Missing required field: reasoning." };
  }

  const requires = (field: string) => action[field] !== undefined && action[field] !== null && String(action[field]).trim().length > 0;
  if (actionType === "navigate" && !requires("url")) return { valid: false, reason: "Navigate action must include url." };
  if ((actionType === "click" || actionType === "extract" || actionType === "type") && !requires("selector")) {
    return { valid: false, reason: `${actionType} action must include selector.` };
  }
  if (actionType === "type" && !requires("value")) return { valid: false, reason: "Type action must include value." };
  if (actionType === "wait" && typeof action.duration !== "number") return { valid: false, reason: "Wait action must include numeric duration." };
  if ((actionType === "respond" || actionType === "done") && !requires("message")) {
    return { valid: false, reason: `${actionType} action must include message.` };
  }
  return { valid: true, actionObj: action };
}

function validateActionPayload(content: string): { valid: boolean; reason?: string; payload?: any } {
  const jsonRaw = extractJsonCodeBlock(content);
  if (!jsonRaw) return { valid: false, reason: "Response is not valid JSON or JSON code block." };

  let payload: any;
  try {
    payload = JSON.parse(jsonRaw);
  } catch {
    return { valid: false, reason: "JSON parsing failed." };
  }

  if (!isObject(payload)) return { valid: false, reason: "Top-level response must be an object." };

  if (Array.isArray(payload.steps)) {
    if (payload.steps.length === 0) return { valid: false, reason: "steps array cannot be empty." };
    for (let i = 0; i < payload.steps.length; i++) {
      const stepValidation = validateSingleAction(payload.steps[i]);
      if (!stepValidation.valid) return { valid: false, reason: `Invalid step ${i + 1}: ${stepValidation.reason}` };
    }
    return { valid: true, payload };
  }

  const singleValidation = validateSingleAction(payload);
  if (!singleValidation.valid) return { valid: false, reason: singleValidation.reason };
  return { valid: true, payload };
}

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
    const validation = validateActionPayload(content);
    if (!validation.valid) {
      return "```json\n" + JSON.stringify({ action: "respond", message: "⚠️ I could not safely execute that because the action format was invalid. Please retry.", reasoning: validation.reason || "Invalid action format", done: false }) + "\n```";
    }

    const payload = validation.payload;
    const actions = Array.isArray(payload.steps) ? payload.steps : [payload];
    for (const action of actions) {
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
    }
  } catch {}
  return null;
}

function ensureDnaSections(content: string): string {
  const requiredSections = ["## DNA Fit", "## Recommendation", "## Next 7 Days", "## KPI Impact"];
  const missing = requiredSections.filter((section) => !content.includes(section));
  if (missing.length === 0) return content;
  const fallback = `
## DNA Fit
This recommendation is aligned using your Business Operating Profile and recent learning signals.

## Recommendation
${content.slice(0, 1200)}

## Next 7 Days
- Convert the recommendation into 3 concrete actions.
- Execute and track measurable outcomes.
- Review and iterate based on performance.

## KPI Impact
- Expected impact: improved decision quality and faster execution with business-specific alignment.
`;
  return fallback.trim();
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
    const { businessId, profileContext, learningContext } = await buildBusinessBrainContext(supabase, {
      userId: user.id,
      brandId: effectiveBrandId,
      workspaceId: workspaceId || employee.workspace_id,
    });

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
      const fullContext = `${profileContext}\n${learningContext}\n${relevantContext}${connectionContext}`;
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
      let eventBuffer = "";

      try {
        while (true) {
          if (Date.now() - startTime > TIMEOUT_MS) { timedOut = true; break; }
          const { done, value } = await reader.read();
          if (done) { streamDone = true; break; }
          eventBuffer += decoder.decode(value, { stream: true });
          const eventBlocks = eventBuffer.split("\n\n");
          eventBuffer = eventBlocks.pop() || "";
          for (const block of eventBlocks) {
            for (const line of block.split("\n")) {
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
          if (streamDone) break;
        }
        if (eventBuffer.trim()) {
          for (const line of eventBuffer.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) { fullContent += delta; emitContent?.(delta); }
            } catch {}
          }
        }
      } finally {
        try { reader.cancel(); } catch {}
      }

      let content = (continuationContent || "") + fullContent;
      content = runPostflightGuardrails(content, safetySettings);
      if (isBrowserMode) {
        const actionValidation = validateActionPayload(content);
        if (!actionValidation.valid) {
          const repairPrompt = `Your last browser-action response was invalid: ${actionValidation.reason || "format error"}.
Return ONLY a valid JSON code block matching the action schema. Do not add prose.`;
          const repairResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You repair malformed browser action JSON. Output only a JSON code block." },
                { role: "user", content: `Invalid response:\n${content}\n\n${repairPrompt}` },
              ],
              stream: false,
            }),
          });
          if (repairResponse.ok) {
            const repairJson = await repairResponse.json();
            const repaired = repairJson?.choices?.[0]?.message?.content || "";
            if (validateActionPayload(repaired).valid) {
              content = repaired;
            }
          }
        }
        const actionBlock = validateBrowserActions(content, safetySettings);
        if (actionBlock) content = actionBlock;
      } else {
        content = ensureDnaSections(content);
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
      await logBusinessLearningEvent(supabase, {
        userId: user.id,
        workspaceId: effectiveWsId,
        businessId: businessId || effectiveBrandId,
        employeeId: employee_id,
        agentSurface: "run-employee",
        mode: "browser",
        userMessage: lastUserMsg,
        assistantResponse: result.content || "",
        profileContext,
        metadata: { queryTopic, searchedProviders, skippedProviders },
      });
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
            sendStep(`Reading what you asked about ${topic}`, "running", "analysis");
            const decision = shouldSearchConnections(connectionLookupQuery);
            sendStep(`Got it — you want help with ${topic}`, "done", "analysis", decision.reason);

            sendStep(`Pulling your business context on ${topic}`, "running", "context");
            const relevantContext = await retrieveRelevantContext(supabase, {
              ...employee,
              workspace_id: effectiveWsId,
              linked_business_id: effectiveBrandId,
            }, lastUserMsg);
            sendStep(`Loaded your business context on ${topic}`, "done", "context");

            const { connectionContext, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision, queryTopic } = await searchConnectedProviders(
              supabase,
              user.id,
              connectionLookupQuery,
              (step) => send({ type: "progress", step }),
              topic,
            );

            let result: { content: string; continuation?: boolean };

            if (preVerifiedContent) {
              sendStep(`Using verified numbers for ${topic}`, "running", "response");
              const verifiedWithSections = ensureDnaSections(preVerifiedContent);
              send({ type: "content", delta: verifiedWithSections });
              result = { content: verifiedWithSections, continuation: false };
              sendStep(`Used verified numbers for ${topic}`, "done", "response");
            } else {
              sendStep(`Writing your answer on ${topic}`, "running", "response");
              result = await buildAiResponse(relevantContext, connectionContext, (delta) => {
                send({ type: "content", delta });
              });
              sendStep(`Wrote your answer on ${topic}`, "done", "response");
            }
            if (!result.continuation) sendStep("All done — here's what I found", "done", "complete");
            await logBusinessLearningEvent(supabase, {
              userId: user.id,
              workspaceId: effectiveWsId,
              businessId: businessId || effectiveBrandId,
              employeeId: employee_id,
              agentSurface: "run-employee",
              mode: "chat",
              userMessage: lastUserMsg,
              assistantResponse: result.content || "",
              profileContext,
              metadata: { queryTopic, searchedProviders, skippedProviders, connectionDecision },
            });

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
