import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import { assistantChatRequestSchema, safeParseJsonBody } from "../_shared/edge-request-schemas.ts";
import { runEmployeeHttpHandler, runEmployeeCorsHeaders } from "../_shared/run-employee/http-handler.ts";
import { consumeWorkspaceAction } from "../_shared/workspace-actions.ts";
import { loadAccountSafetySettings, mergeSafetySettings } from "../_shared/account-safety.ts";
import {
  runPreflightGuardrails,
  runPostflightGuardrails,
  validateActionPayload,
  validateBrowserActions,
} from "../_shared/guardrails.ts";
import { edgeLog, userIdShort } from "../_shared/edge-logger.ts";
import { resolveAssistantReplyContract } from "../_shared/assistant-reply-contract.ts";
import { formatSessionMemoryBlock } from "../_shared/session-memory-context.ts";
import { buildBusinessBrainContext, logBusinessLearningEvent } from "../_shared/run-employee/business-brain.ts";
import { shouldSearchConnections, extractQueryTopic, searchConnectedProviders } from "../_shared/run-employee/connections.ts";
import { runQuestionGate, formatQuestionGatePromptBlock } from "../_shared/question-gate.ts";
import { runDnaContextRouter, formatDnaRouterBlock } from "../_shared/dna-context-router.ts";
import { buildPerformanceEvidenceMarkdown } from "../_shared/performance-evidence.ts";
import { buildDataBackedRoutingBlock } from "../_shared/data-backed-evidence.ts";
import { loadAssistantBrandIdentity, retrieveRelevantContextForAssistant } from "../_shared/pipeline/rag-assistant.ts";
import { buildBrowserActionBlock } from "../_shared/pipeline/blocks/browser-action.ts";
import { createAssistantChatSseResponse } from "../_shared/pipeline/assistant-chat-stream.ts";
import { extractLastUserMessage } from "../_shared/run-employee/rag.ts";
import { classifyAssistantGoal, expandQueryForConnectors } from "../_shared/pipeline/goalSetter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function loadSafetySettings(supabase: any, brandId?: string): Promise<any | null> {
  if (!brandId) return null;
  const { data } = await supabase.from("user_business_data").select("content").eq("id", brandId).single();
  if (!data?.content) return null;
  try {
    const parsed = JSON.parse(data.content);
    return parsed?.safetySettings || null;
  } catch {
    return null;
  }
}

function buildPageSection(pageContext: any): string {
  if (!pageContext) return "";
  return `
## Current Browser Page Context
- **URL:** ${pageContext.url || "unknown"}
- **Title:** ${pageContext.title || "unknown"}
${pageContext.selectedText ? `- **Selected Text:** "${pageContext.selectedText}"` : ""}
${pageContext.pageContent ? `\n### Page Content (extracted)\n${pageContext.pageContent.slice(0, 15000)}` : ""}
${pageContext.formFields ? `\n### Visible Form Fields\n${JSON.stringify(pageContext.formFields, null, 2)}` : ""}
${pageContext.links ? `\n### Key Links\n${JSON.stringify(pageContext.links.slice(0, 30), null, 2)}` : ""}
${pageContext.metadata ? `\n### Page Metadata\n${JSON.stringify(pageContext.metadata, null, 2)}` : ""}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawText = await req.text();
    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(rawText || "{}");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedBody = safeParseJsonBody(jsonBody, assistantChatRequestSchema);
    if (!parsedBody.ok) {
      return new Response(JSON.stringify({ error: parsedBody.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = parsedBody.data;
    if (data.employee_id) {
      const fwd = new Request(req.url, { method: req.method, headers: req.headers, body: rawText });
      return runEmployeeHttpHandler(fwd, { agentSurface: "assistant-chat", logTag: "assistant-chat" });
    }

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

    const {
      messages: rawMessages,
      pageContext,
      brandId: rawBrandId,
      workspaceId: rawWorkspaceId,
      browserMode,
      sessionMemory,
      taskType = "chat",
      planMode: rawPlanMode,
    } = data;
    const messages = rawMessages ?? [];
    const brandId = rawBrandId ?? undefined;
    const workspaceId = rawWorkspaceId ?? undefined;
    const planMode = !!rawPlanMode;

    edgeLog("assistant-chat", "request", {
      user: userIdShort(user.id),
      browserMode: !!browserMode,
      hasPageContext: !!pageContext,
      planMode,
    });

    // Pre-check that the workspace still has actions left. We deduct the
    // measured/estimated cost AFTER the AI call(s) below.
    const { checkWorkspaceActionsAvailable } = await import("../_shared/workspace-actions.ts");
    const usage = await checkWorkspaceActionsAvailable(supabase, user.id, workspaceId ?? null);
    if (!usage.allowed) {
      return new Response(JSON.stringify({ error: usage.reason || "Action limit reached. Upgrade your plan." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const brandSafetySettings = await loadSafetySettings(supabase, brandId);
    const accountSafetySettings = await loadAccountSafetySettings(supabase, user.id);
    const safetySettings = mergeSafetySettings(brandSafetySettings, accountSafetySettings);
    const identity = await loadAssistantBrandIdentity(supabase, user.id, brandId);
    const lastUserMsg = extractLastUserMessage(messages);
    const historyForGate = Array.isArray(messages)
      ? (messages as Array<{ role: string; content: string }>).map((m) => ({
        role: String(m.role),
        content: String(m.content || ""),
      }))
      : [];
    // Plan-mode chip controls the strategic-plan contract. When OFF, never
    // emit the [PLAN_ARTIFACT] document even if the user's wording matches
    // strategic keywords — answer inline like a normal chat reply.
    const autoContract = resolveAssistantReplyContract(lastUserMsg, historyForGate);
    const replyContract = planMode
      ? "strategic_plan"
      : (autoContract === "strategic_plan" ? "direct" : autoContract);
    const { businessId, profileContext, learningContext } = await buildBusinessBrainContext(supabase, {
      userId: user.id,
      brandId,
      workspaceId,
    });
    const questionGate = runQuestionGate({
      message: lastUserMsg,
      profileContext,
      history: historyForGate,
    });
    const questionGateBlock = formatQuestionGatePromptBlock(questionGate);
    const dnaRoute = await runDnaContextRouter(supabase, user.id, workspaceId, brandId, lastUserMsg, replyContract);
    const dnaRouterBlock = formatDnaRouterBlock(dnaRoute);
    const performanceEvidence = businessId
      ? await buildPerformanceEvidenceMarkdown(supabase, businessId, 30)
      : "";

    const preflightBlock = runPreflightGuardrails(lastUserMsg, safetySettings);
    if (preflightBlock) {
      return new Response(JSON.stringify({ content: preflightBlock }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topic = extractQueryTopic(lastUserMsg);
    const initialConnectionDecision = shouldSearchConnections(lastUserMsg);
    const userMsg = messages?.[messages.length - 1]?.content || "";
    const memoryBlock = formatSessionMemoryBlock(sessionMemory);

    if (browserMode && pageContext) {
      const relevantContext = await retrieveRelevantContextForAssistant(
        supabase,
        user.id,
        workspaceId,
        lastUserMsg,
        brandId,
        true,
      );
      const browserGoal = classifyAssistantGoal(lastUserMsg);
      const browserBoost = expandQueryForConnectors(browserGoal, topic);
      const { connectionContext, sourceRegistry, searchedProviders, skippedProviderDetails, connectionDecision, queryTopic } =
        await searchConnectedProviders(
          supabase,
          user.id,
          lastUserMsg,
          undefined,
          topic,
          browserBoost,
        );

      const pageSection = buildPageSection(pageContext);
      const browserDataBacked = buildDataBackedRoutingBlock({
        replyContract,
        liveLookupRan: initialConnectionDecision.shouldSearch,
        webSnapshotRan: false,
      });
      const fullContext =
        `${profileContext}\n${learningContext}${memoryBlock}${relevantContext}${connectionContext}${dnaRouterBlock ? `\n${dnaRouterBlock}` : ""}${
          performanceEvidence ? `\n\n## Performance Evidence (KPI Windows)\n${performanceEvidence}` : ""
        }${questionGateBlock ? `\n\n${questionGateBlock}` : ""}\n\n${browserDataBacked}`;
      const safetySummary = safetySettings?.integrityEnabled !== false
        ? `1. **NEVER make payments**
2. **NEVER sign up or create accounts**
3. **NEVER log in**
4. **NEVER enter sensitive data**
5. If you encounter any of the above, STOP and use "respond" to ask the user to handle it manually.`
        : "- Integrity guardrails are disabled. Still exercise caution with sensitive actions.";
      const systemPrompt = buildBrowserActionBlock(pageSection, identity, fullContext, safetySummary);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: false,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const errorBody = await response.text().catch(() => "");
        console.error("AI gateway error: status", status, "body:", errorBody.slice(0, 200));
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI service unavailable");
      }

      supabase.from("timewarp_chats").insert({
        user_id: user.id,
        user_message: typeof userMsg === "string" ? userMsg : JSON.stringify(userMsg),
        page_url: pageContext?.url || null,
      }).then(() => {});

      const aiResult = await response.json();
      let content = aiResult.choices?.[0]?.message?.content || "";
      const aiCalls: { model: string; usage?: any }[] = [
        { model: "google/gemini-3-flash-preview", usage: aiResult?.usage },
      ];
      const actionValidation = validateActionPayload(content);
      if (!actionValidation.valid) {
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
              { role: "user", content: `Invalid response:\n${content}\n\nReturn a corrected JSON action payload only.` },
            ],
            stream: false,
          }),
        });
        if (repairResponse.ok) {
          const repairJson = await repairResponse.json();
          const repaired = repairJson?.choices?.[0]?.message?.content || "";
          if (validateActionPayload(repaired).valid) content = repaired;
          aiCalls.push({ model: "google/gemini-3-flash-preview", usage: repairJson?.usage });
        }
      }
      content = runPostflightGuardrails(content, safetySettings);
      const actionBlock = validateBrowserActions(content, safetySettings);
      if (actionBlock) content = actionBlock;
      const guardrailIntervened = !!actionBlock;
      await logBusinessLearningEvent(supabase, {
        userId: user.id,
        workspaceId,
        businessId: businessId || brandId,
        agentSurface: "assistant-chat",
        mode: "browser",
        userMessage: lastUserMsg,
        assistantResponse: content,
        profileContext,
        metadata: {
          queryTopic,
          searchedProviders,
          connectionDecision,
          reply_contract: replyContract,
          plan_generated: /\[PLAN_ARTIFACT\]/i.test(content),
          guardrail_intervened: guardrailIntervened,
          outcome: guardrailIntervened ? "negative" : "positive",
        },
      });

      // Charge actions based on the actual measured AI cost.
      try {
        const { computeCallCostUsd } = await import("../_shared/ai-cost.ts");
        const costUsd = computeCallCostUsd({ ai: aiCalls });
        await consumeWorkspaceAction(supabase, user.id, workspaceId ?? null, costUsd);
      } catch (e) {
        console.error("[assistant-chat:browser] consume action failed:", (e as Error)?.message);
      }

      return new Response(
        JSON.stringify({
          content,
          connectionDecision,
          searchedProviders,
          skippedProviderDetails,
          queryTopic,
          liveSourceRegistry: sourceRegistry,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Streaming SSE path: estimate cost from prompt size and consume up-front
    // (we can't easily measure completion tokens out of the streamed response).
    try {
      const { estimateAiCostUsd } = await import("../_shared/ai-cost.ts");
      const promptText = (Array.isArray(messages) ? messages.map((m: any) => String(m?.content ?? "")).join("\n") : "")
        + "\n" + (profileContext || "") + "\n" + (lastUserMsg || "");
      const costUsd = estimateAiCostUsd({
        model: "google/gemini-3-flash-preview",
        promptText,
        estimatedCompletionTokens: 1500,
      });
      await consumeWorkspaceAction(supabase, user.id, workspaceId ?? null, costUsd);
    } catch (e) {
      console.error("[assistant-chat:sse] consume action failed:", (e as Error)?.message);
    }

    return createAssistantChatSseResponse(
      {
        supabase,
        user,
        messages,
        brandId,
        workspaceId,
        sessionMemory,
        taskType,
        lastUserMsg,
        userMsg,
        safetySettings,
        replyContract,
        businessId,
        profileContext,
        questionGate,
      },
      corsHeaders,
    );
  } catch (e) {
    edgeLog("assistant-chat", "handler_error", { message: String((e as Error)?.message || e) });
    console.error("assistant-chat error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
