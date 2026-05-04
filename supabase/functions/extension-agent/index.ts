import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

import {
  shouldSearchConnections,
  extractQueryTopic,
  searchConnectedProviders,
} from "../_shared/run-employee/connections.ts";
import {
  buildBusinessBrainContext,
  logBusinessLearningEvent,
} from "../_shared/run-employee/business-brain.ts";
import { resolveAssistantReplyContract } from "../_shared/assistant-reply-contract.ts";
import { buildAssistantGroundingBlock } from "../_shared/assistant-grounding.ts";
import { formatSessionMemoryBlock } from "../_shared/session-memory-context.ts";
import { sanitizeAssistantAgainstLiveContext } from "../_shared/live-response-guard.ts";
import { buildPerformanceEvidenceMarkdown } from "../_shared/performance-evidence.ts";
import { formatQuestionGatePromptBlock, runQuestionGate } from "../_shared/question-gate.ts";
import { formatDnaRouterBlock, runDnaContextRouter } from "../_shared/dna-context-router.ts";
import {
  runPreflightGuardrails,
  runPostflightGuardrails,
  validateActionPayload,
  validateBrowserActions,
} from "../_shared/guardrails.ts";
import { loadAccountSafetySettings, mergeSafetySettings } from "../_shared/account-safety.ts";
import { extensionAgentRequestSchema, safeParseJsonBody } from "../_shared/edge-request-schemas.ts";
import { edgeLog, userIdShort } from "../_shared/edge-logger.ts";
import { resolveDashboardCardsForChat } from "../_shared/dashboard-chat-context.ts";
import {
  buildSkillsBlock,
  matchSkillsForMessage,
  matchSkillSticky,
} from "../_shared/skills/_router.ts";
import { workforceTools } from "../_shared/workforce-tools.ts";
import { buildDataBackedRoutingBlock } from "../_shared/data-backed-evidence.ts";
import {
  extractWebSearchQuery,
  fetchPublicWebSnapshot,
  shouldFetchPublicWebContext,
} from "../_shared/public-web-snapshot.ts";
import { normalizeChatCompletionDeltaContent } from "../_shared/gateway-stream-delta.ts";
import { buildAssistantPipelinePrompt } from "../_shared/pipeline/context.ts";
import { executeAssistantChatTool } from "../_shared/pipeline/tools.ts";
import { classifyAssistantGoal, expandQueryForConnectors } from "../_shared/pipeline/goalSetter.ts";
import { buildConnectorProgressLabel } from "../_shared/pipeline/personalLogger.ts";
import { runPostFlightEvidence } from "../_shared/pipeline/post-flight.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STOPWORDS = new Set(["this","that","with","from","have","been","were","they","their","what","about","which","when","where","will","would","could","should","there","these","those","some","other","into","more","also","than","then","just","only","very","much","such","like","over","after","before","between","under","each","every","both","most","same","does","doing","done","make","made","know","think","want","need","help","find","give","tell","show","look","come","back","take","well","still","even","here","many","while"]);

async function loadSafetySettings(supabase: any, brandId?: string): Promise<any | null> {
  if (!brandId) return null;
  const { data } = await supabase
    .from("user_business_data")
    .select("content")
    .eq("id", brandId)
    .single();
  if (!data?.content) return null;
  try {
    const parsed = JSON.parse(data.content);
    return parsed?.safetySettings || null;
  } catch { return null; }
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

    let jsonBody: unknown;
    try {
      jsonBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsedBody = safeParseJsonBody(jsonBody, extensionAgentRequestSchema);
    if (!parsedBody.ok) {
      return new Response(JSON.stringify({ error: parsedBody.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cost-based action consumption: estimate from prompt size since the
    // multi-step runner streams progress back to the client.
    const requestedWorkspaceId = (jsonBody as any)?.workspaceId ?? null;
    const { consumeWorkspaceAction } = await import("../_shared/workspace-actions.ts");
    const { estimateAiCostUsd } = await import("../_shared/ai-cost.ts");
    const _promptApprox = JSON.stringify((jsonBody as any)?.messages ?? []);
    const _costUsd = estimateAiCostUsd({
      model: "google/gemini-3-flash-preview",
      promptText: _promptApprox,
      estimatedCompletionTokens: 1500,
    });
    const usage = await consumeWorkspaceAction(supabase, user.id, requestedWorkspaceId, _costUsd);
    if (!usage.allowed) {
      return new Response(JSON.stringify({ error: usage.reason || "Action limit reached. Upgrade your plan." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { messages: rawMessages, pageContext, brandId: rawBrandId, workspaceId: rawWorkspaceId, browserMode, sessionMemory, taskType = "chat" } = parsedBody.data;
    const messages = rawMessages ?? [];
    const brandId = rawBrandId ?? undefined;
    const workspaceId = rawWorkspaceId ?? undefined;

    edgeLog("extension-agent", "request", {
      user: userIdShort(user.id),
      browserMode: !!browserMode,
      hasPageContext: !!pageContext,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const brandSafetySettings = await loadSafetySettings(supabase, brandId);
    const accountSafetySettings = await loadAccountSafetySettings(supabase, user.id);
    const safetySettings = mergeSafetySettings(brandSafetySettings, accountSafetySettings);
    const identity = await loadBusinessIdentity(supabase, user.id, brandId);
    const lastUserMsg = extractLastUserMessage(messages);
    const historyForGate = Array.isArray(messages)
      ? (messages as Array<{ role: string; content: string }>).map((m) => ({
          role: String(m.role),
          content: String(m.content || ""),
        }))
      : [];
    const replyContract = resolveAssistantReplyContract(lastUserMsg, historyForGate);
    const { businessId, profileContext, learningContext } = await buildBusinessBrainContext(supabase, {
      userId: user.id,
      brandId,
      workspaceId,
    });
    const questionGate = runQuestionGate({
      message: lastUserMsg,
      profileContext,
      // Pass the full conversation so the gate can detect when the user is
      // ANSWERING a prior clarifying question (and remind the AI to keep
      // working on the original request rather than treating the answer as
      // a brand-new prompt).
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

    const buildPageSection = () => {
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
    };

    if (browserMode) {
      const relevantContext = await retrieveRelevantContext(supabase, user.id, workspaceId, lastUserMsg, brandId, browserMode);
      const extBrowserGoal = classifyAssistantGoal(lastUserMsg);
      const extBrowserBoost = expandQueryForConnectors(extBrowserGoal, topic);
      const { connectionContext, sourceRegistry, searchedProviders, skippedProviderDetails, connectionDecision, queryTopic } = await searchConnectedProviders(
        supabase,
        user.id,
        lastUserMsg,
        undefined,
        topic,
        extBrowserBoost,
      );

      const pageSection = buildPageSection();
      const browserDataBacked = buildDataBackedRoutingBlock({
        replyContract,
        liveLookupRan: initialConnectionDecision.shouldSearch,
        webSnapshotRan: false,
      });
      const fullContext = `${profileContext}\n${learningContext}${memoryBlock}${relevantContext}${connectionContext}${dnaRouterBlock ? `\n${dnaRouterBlock}` : ""}${performanceEvidence ? `\n\n## Performance Evidence (KPI Windows)\n${performanceEvidence}` : ""}${questionGateBlock ? `\n\n${questionGateBlock}` : ""}\n\n${browserDataBacked}`;
      const systemPrompt = buildBrowserActionPrompt(pageSection, identity, fullContext, safetySettings);

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
            ...messages,
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const errorBody = await response.text().catch(() => "");
        console.error("AI gateway error: status", status, "body:", errorBody.slice(0, 200));
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        agentSurface: "extension-agent",
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
      return new Response(JSON.stringify({ content, connectionDecision, searchedProviders, skippedProviderDetails, queryTopic, liveSourceRegistry: sourceRegistry }), {
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
        // Accumulator for streamed function tool calls (OpenAI-style).
        // Multiple tool calls can arrive interleaved across deltas, keyed by index.
        type AccumulatedToolCall = { id?: string; name: string; arguments: string };
        const parseGatewayEvent = (
          eventBlock: string,
          onDelta: (delta: string) => void,
          toolCalls?: Map<number, AccumulatedToolCall>,
        ) => {
          for (const line of eventBlock.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = normalizeChatCompletionDeltaContent(parsed.choices?.[0]?.delta?.content);
              if (delta.length > 0) onDelta(delta);
              const tcDeltas = parsed.choices?.[0]?.delta?.tool_calls;
              if (toolCalls && Array.isArray(tcDeltas)) {
                for (const tc of tcDeltas) {
                  const idx = typeof tc.index === "number" ? tc.index : 0;
                  const cur = toolCalls.get(idx) || { name: "", arguments: "" };
                  if (tc.id) cur.id = tc.id;
                  if (tc.function?.name) cur.name = tc.function.name;
                  if (tc.function?.arguments) cur.arguments += tc.function.arguments;
                  toolCalls.set(idx, cur);
                }
              }
            } catch {
              // Ignore malformed partial events
            }
          }
        };

        (async () => {
          try {
            if (
              questionGate &&
              !questionGate.complete &&
              !questionGate.isAnswerToPriorQuestion &&
              questionGate.mandatoryQuestions?.length
            ) {
              send({ type: "questions", questions: questionGate.mandatoryQuestions });
            }

            const pageSection = buildPageSection();
            const hasBrowserContext = !!pageContext;

            let connectionContext = "";
            let sourceRegistry: Record<string, unknown> = {};
            let searchedProviders: string[] = [];
            let skippedProviderDetails: unknown[] = [];
            let connectionDecision: unknown = { shouldSearch: false, reason: "" };
            let answerTopic = topic;
            let systemPrompt = "";
            let gatewayTools: unknown[] = workforceTools;
            let offerWorkforceTools = !hasBrowserContext;

            if (!hasBrowserContext) {
              const assembled = await buildAssistantPipelinePrompt({
                supabase,
                userId: user.id,
                brandId: brandId ?? null,
                workspaceId: workspaceId ?? null,
                lastUserMsg,
                messages,
                taskType,
                sessionMemory: sessionMemory ?? null,
                replyContract,
                send,
                sendStep,
              });
              connectionContext = assembled.connectionContext;
              sourceRegistry = assembled.sourceRegistry as Record<string, unknown>;
              searchedProviders = Array.isArray(assembled.searchedProviders)
                ? (assembled.searchedProviders as string[])
                : [];
              skippedProviderDetails = Array.isArray(assembled.skippedProviderDetails) ? assembled.skippedProviderDetails : [];
              connectionDecision = assembled.connectionDecision;
              answerTopic = String(assembled.queryTopic || topic || "").trim() || topic;
              systemPrompt = assembled.systemPrompt;
              gatewayTools = assembled.tools as unknown[];
              offerWorkforceTools = assembled.offerTools;
            } else {
              const streamGoal = classifyAssistantGoal(lastUserMsg);
              const streamBoost = expandQueryForConnectors(streamGoal, topic);
              const s0 = buildConnectorProgressLabel("start", streamGoal);
              sendStep(s0.label, "running", s0.action);
              sendStep(s0.label, "done", s0.action);
              const c0 = buildConnectorProgressLabel("connectors", streamGoal, initialConnectionDecision.reason);
              sendStep(c0.label, "running", c0.action);
              const relevantContext = await retrieveRelevantContext(supabase, user.id, workspaceId, lastUserMsg, brandId, browserMode);
              sendStep(c0.label, "done", c0.action);
              const conn = await searchConnectedProviders(
                supabase,
                user.id,
                lastUserMsg,
                (step) => send({ type: "progress", step }),
                topic,
                streamBoost,
              );
              connectionContext = conn.connectionContext;
              sourceRegistry = conn.sourceRegistry as Record<string, unknown>;
              searchedProviders = conn.searchedProviders;
              skippedProviderDetails = conn.skippedProviderDetails;
              connectionDecision = conn.connectionDecision;
              answerTopic = conn.queryTopic || topic;
              if (sourceRegistry && Object.keys(sourceRegistry).length > 0) {
                send({ type: "live_sources", registry: sourceRegistry });
              }

              let dashboardMarkdown = "";
              if (brandId && lastUserMsg && taskType === "chat" && !pageContext) {
                const d0 = buildConnectorProgressLabel("dashboard", streamGoal);
                sendStep(d0.label, "running", d0.action);
                const dash = await resolveDashboardCardsForChat(supabase, {
                  userId: user.id,
                  brandId,
                  userMessage: lastUserMsg,
                  send,
                });
                dashboardMarkdown = dash.markdown;
                sendStep(d0.label, "done", d0.action);
              }

              const webScheduled = false;
              let publicWebBlock = "";
              const dataBackedBlock = buildDataBackedRoutingBlock({
                replyContract,
                liveLookupRan: initialConnectionDecision.shouldSearch,
                webSnapshotRan: webScheduled,
              });
              const fullContext =
                `${profileContext}\n${learningContext}${memoryBlock}${relevantContext}${connectionContext}${dashboardMarkdown}${publicWebBlock}${dnaRouterBlock ? `\n${dnaRouterBlock}` : ""}${
                  performanceEvidence ? `\n\n## Performance Evidence (KPI Windows)\n${performanceEvidence}` : ""
                }${questionGateBlock ? `\n\n${questionGateBlock}` : ""}\n\n${dataBackedBlock}`;
              systemPrompt = buildBrowserPrompt(pageSection, identity, fullContext, safetySettings);
            }

            supabase.from("timewarp_chats").insert({
              user_id: user.id,
              user_message: typeof userMsg === "string" ? userMsg : JSON.stringify(userMsg),
              page_url: pageContext?.url || null,
            }).then(() => {});

            const craftGoal = classifyAssistantGoal(lastUserMsg);
            const craft = buildConnectorProgressLabel("llm", craftGoal);
            if (replyContract === "strategic_plan") {
              sendStep("Building strategic plan...", "running", "response");
            }
            sendStep(craft.label, "running", craft.action);

            const callGateway = async (msgs: any[], includeTools: boolean) => {
              return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-3-flash-preview",
                  messages: msgs,
                  stream: true,
                  ...(includeTools ? { tools: gatewayTools, tool_choice: "auto" } : {}),
                }),
              });
            };

            const consumeStream = async (
              res: Response,
              opts: { collectToolCalls: boolean },
            ): Promise<{ content: string; toolCalls: AccumulatedToolCall[] }> => {
              const reader = res.body?.getReader();
              if (!reader) throw new Error("No response body");
              const decoder = new TextDecoder();
              let buf = "";
              let content = "";
              const toolCallMap = opts.collectToolCalls ? new Map<number, AccumulatedToolCall>() : undefined;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const blocks = buf.split("\n\n");
                buf = blocks.pop() || "";
                for (const block of blocks) {
                  parseGatewayEvent(block, (delta) => {
                    content += delta;
                    send({ type: "content", delta });
                  }, toolCallMap);
                }
              }
              if (buf.trim()) {
                parseGatewayEvent(buf, (delta) => {
                  content += delta;
                  send({ type: "content", delta });
                }, toolCallMap);
              }
              const toolCalls = toolCallMap
                ? Array.from(toolCallMap.values()).filter((t) => t.name && t.arguments)
                : [];
              return { content, toolCalls };
            };

            const initialMessages = [
              { role: "system", content: systemPrompt },
              ...messages,
            ];

            const response = await callGateway(initialMessages, offerWorkforceTools);
            if (!response.ok) {
              const status = response.status;
              const errorBody = await response.text().catch(() => "");
              console.error("AI gateway error: status", status, "body:", errorBody.slice(0, 200));
              if (status === 429) throw new Error("Rate limit exceeded.");
              if (status === 402) throw new Error("AI credits exhausted.");
              throw new Error("AI service unavailable");
            }

            const first = await consumeStream(response, { collectToolCalls: offerWorkforceTools });
            let fullContent = first.content;

            // If the model called create_agent / create_employee, execute it,
            // then re-prompt the model with the tool result so it produces a
            // human confirmation.
            if (first.toolCalls.length > 0) {
              sendStep("Saving to your workforce", "running", "workforce");
              const toolResults: { tool_call_id: string; name: string; result: any }[] = [];
              for (const tc of first.toolCalls) {
                let parsedArgs: any = {};
                try { parsedArgs = JSON.parse(tc.arguments); } catch (e) {
                  console.error("[workforce-tool] failed to parse arguments:", tc.arguments?.slice(0, 200));
                }
                const result = await executeAssistantChatTool(tc.name, parsedArgs, {
                  supabase,
                  userId: user.id,
                  workspaceId,
                  brandId,
                }) as { ok?: boolean; kind?: string; id?: string; name?: string; error?: string; tab?: string };
                edgeLog("extension-agent", "tool_executed", {
                  name: tc.name, ok: result.ok, id: result.id, error: result.error,
                });
                if (result.ok) {
                  if (tc.name === "create_agent" || tc.name === "create_employee") {
                    send({
                      type: "created_entity",
                      kind: result.kind,
                      id: result.id,
                      name: result.name,
                    });
                  }
                  if (
                    (tc.name === "create_todo" || tc.name === "create_objective" || tc.name === "create_briefing" ||
                      tc.name === "create_update") && result.kind === "dashboard"
                  ) {
                    send({
                      type: "dashboard_card_created",
                      tab: result.tab,
                      id: result.id,
                      title: result.name,
                    });
                  }
                }
                toolResults.push({
                  tool_call_id: tc.id || `${tc.name}_${Math.random().toString(36).slice(2, 8)}`,
                  name: tc.name,
                  result,
                });
              }
              sendStep("Saving to your workforce", "done", "workforce");

              // Re-prompt the model with the assistant tool_calls + tool messages.
              const followUpMessages: any[] = [
                ...initialMessages,
                {
                  role: "assistant",
                  content: fullContent || null,
                  tool_calls: first.toolCalls.map((tc) => ({
                    id: tc.id || `${tc.name}_call`,
                    type: "function",
                    function: { name: tc.name, arguments: tc.arguments },
                  })),
                },
                ...toolResults.map((tr) => ({
                  role: "tool",
                  tool_call_id: tr.tool_call_id,
                  content: JSON.stringify(tr.result),
                })),
              ];

              const followUp = await callGateway(followUpMessages, false);
              if (followUp.ok) {
                const second = await consumeStream(followUp, { collectToolCalls: false });
                if (second.content) fullContent = (fullContent ? fullContent + "\n\n" : "") + second.content;
              } else {
                // Fall back to a deterministic confirmation line so the user always sees something.
                const okOnes = toolResults.filter((t) => t.result.ok);
                if (okOnes.length > 0) {
                  const line = okOnes
                    .map((t) => {
                      const r = t.result as { kind?: string; name?: string };
                      if (r.kind === "dashboard") return `✅ Added dashboard item **${r.name || "item"}**.`;
                      return `✅ Created ${r.kind} **${r.name}**.`;
                    })
                    .join("\n");
                  fullContent = (fullContent ? fullContent + "\n\n" : "") + line;
                  send({ type: "content", delta: (fullContent ? "\n\n" : "") + line });
                }
              }
            }

            let finalContent = runPostflightGuardrails(fullContent, safetySettings);
            finalContent = sanitizeAssistantAgainstLiveContext(finalContent, connectionContext);
            const enforcement = runPostFlightEvidence(finalContent);
            send({
              type: "post_flight",
              enforcement: {
                score: enforcement.score,
                confidence: enforcement.confidence,
                warnings: enforcement.warnings || [],
              },
            });
            sendStep(craft.label, "done", craft.action);
            sendStep("Finished", "done", "complete");
            await logBusinessLearningEvent(supabase, {
              userId: user.id,
              workspaceId,
              businessId: businessId || brandId,
              agentSurface: "extension-agent",
              mode: hasBrowserContext ? "browser" : "chat",
              userMessage: lastUserMsg,
              assistantResponse: finalContent,
              profileContext,
              metadata: {
                queryTopic: answerTopic,
                searchedProviders,
                connectionDecision,
                reply_contract: replyContract,
                plan_generated: /\[PLAN_ARTIFACT\]/i.test(finalContent),
                outcome: finalContent && finalContent.length > 40 ? "positive" : "negative",
              },
            });
            send({
              type: "result",
              content: finalContent,
              replyContract,
              connectionDecision,
              searchedProviders,
              skippedProviderDetails,
              queryTopic: answerTopic,
              liveSourceRegistry: sourceRegistry,
            });
            close();
          } catch (error: any) {
            edgeLog("extension-agent", "stream_error", { message: String(error?.message || error) });
            console.error("extension-agent stream error:", error?.message || error);
            send({ type: "error", error: error?.message || "An internal error occurred" });
            close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    edgeLog("extension-agent", "handler_error", { message: String((e as Error)?.message || e) });
    console.error("extension-agent error occurred");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- RAG Helpers ---

function extractKeywords(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOPWORDS.has(w));
}

function extractLastUserMessage(messages: any[]): string {
  if (!messages || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const c = messages[i].content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) return c.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ");
    }
  }
  return "";
}

function scoreItem(keywords: string[], title: string, contentSnippet: string): number {
  if (keywords.length === 0) return 0;
  const haystack = (title + " " + contentSnippet).toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) matches++;
  }
  return matches / keywords.length;
}

async function loadBusinessIdentity(supabase: any, userId: string, brandId?: string): Promise<string> {
  if (!brandId) return "";
  const { data: brandRow } = await supabase
    .from("user_business_data")
    .select("title, content")
    .eq("id", brandId)
    .single();

  if (!brandRow) return "";
  let identity = `Business: ${brandRow.title}`;
  if (brandRow.content) {
    try {
      const parsed = JSON.parse(brandRow.content);
      if (parsed.name) identity += ` | Brand: ${parsed.name}`;
      if (parsed.category) identity += ` | Category: ${parsed.category}`;
      if (parsed.agentName) identity += ` | Agent: ${parsed.agentName}`;
    } catch {}
  }
  return identity;
}

async function retrieveRelevantContext(supabase: any, userId: string, workspaceId?: string, userQuery?: string, brandId?: string, browserMode?: boolean): Promise<string> {
  const keywords = extractKeywords(userQuery || "");
  // In browser mode, even with no keyword matches, include brand context
  const isContentCreation = /\b(slide|pitch|present|report|document|graphic|chart|spreadsheet|analytics|brand|investor|deck|proposal|summary|overview)\b/i.test(userQuery || "");
  if (keywords.length === 0 && !browserMode && !isContentCreation) return "";

  // If a brandId is provided, resolve the brand's logical ID so we can scope all results
  let brandLogicalId: string | null = null;
  if (brandId) {
    const { data: brandRow } = await supabase
      .from("user_business_data")
      .select("content")
      .eq("id", brandId)
      .single();
    if (brandRow?.content) {
      try { brandLogicalId = JSON.parse(brandRow.content)?.id || null; } catch {}
    }
  }

  let query = supabase
    .from("user_business_data")
    .select("id, title, content, analyzed_content, data_type, source");

  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  else query = query.eq("user_id", userId);

  const { data: items } = await query.limit(200);
  if (!items || items.length === 0) return "";

  // Filter to only items belonging to the selected brand
  let filtered = items;
  if (brandId || brandLogicalId) {
    filtered = items.filter((item: any) => {
      // The brand record itself
      if (item.id === brandId) return true;
      // Products/audiences/data that reference this brand in their content JSON
      if (brandLogicalId && item.content) {
        try {
          const parsed = JSON.parse(item.content);
          if (parsed.brandId === brandLogicalId) return true;
        } catch {}
      }
      // Canvas/manual items tagged with the brand in metadata
      if (item.content?.includes(brandLogicalId || "")) return true;
      return false;
    });
  }

  const scoreThreshold = browserMode ? 0.0 : 0.1;
  const maxResults = browserMode ? 8 : 5;
  const snippetLen = browserMode ? 800 : 500;

  const allScored = filtered.map((item: any) => {
    const snippet = (item.analyzed_content || item.content || "").slice(0, 300);
    return { ...item, score: keywords.length > 0 ? scoreItem(keywords, item.title || "", snippet) : (["brand","product","audience"].includes(item.data_type) ? 1 : 0.05) };
  }).sort((a: any, b: any) => b.score - a.score);

  const top = allScored.filter((i: any) => i.score >= scoreThreshold).slice(0, maxResults);

  // Always ensure brand, product, and audience are represented for fact-checking
  const requiredTypes = ["brand", "product", "audience"];
  for (const dt of requiredTypes) {
    if (!top.some((i: any) => i.data_type === dt)) {
      const candidate = allScored.find((i: any) => i.data_type === dt && !top.includes(i));
      if (candidate) {
        if (top.length >= maxResults) top.pop();
        top.push(candidate);
      }
    }
  }

  if (top.length === 0) return "";

  let context = "\n\n## Reference Material (from your business database)\nUse this knowledge to inform HOW you execute the task. It may contain strategies, preferred tools, platforms, methods, or domain expertise. When the Reference Material includes brand, product, or audience records, always cross-check your response against those records for accuracy.\n";
  for (const item of top) {
    context += `\n### ${item.title} (${item.data_type})\n`;
    const text = item.analyzed_content || item.content || "";
    context += text.slice(0, snippetLen) + "\n";
  }
  return context;
}

// --- Prompt Builders ---

function buildBrowserActionPrompt(pageSection: string, identity: string, relevantContext: string, safetySettings?: any): string {
  return `You are an AI executing tasks through the user's browser. You follow instructions precisely, one action at a time. Describe yourself only as an AI if needed — never as a CEO, assistant, agent, employee, or other role title. Never mention "RAG", "knowledge files", or "knowledge base".

${identity ? `# Business Context\n${identity}` : ""}
${relevantContext}
${pageSection}

## DNA ALIGNMENT CONTRACT — MUST FOLLOW
Every action plan must align with the Business Operating Profile and Learning Signals above.
Include a short DNA-fit cue in each "reasoning" field.

## TASK PLANNING — MANDATORY FIRST STEP
Before executing ANY browser action, you MUST plan your approach:
1. **Analyze the user's request** — What is the actual goal? (e.g., "find a winning ecom product" means researching trending products with high margins, not literally Googling that phrase)
2. **Check your Reference Material above** — Does the business context contain strategies, preferred platforms, tools, methods, or domain knowledge about HOW to accomplish this task? If so, FOLLOW those methods.
3. **Choose the RIGHT platform/website** — Do NOT default to Google. Think about WHERE an expert would go:
   - Product research → AliExpress trending, Amazon Best Sellers, TikTok Creative Center, Minea, etc.
   - Market research → SimilarWeb, Google Trends, industry-specific sites
   - Competitor analysis → The competitor's actual website, social media
   - Content ideas → TikTok, Instagram, YouTube trending
   - Ad research → Facebook Ad Library, TikTok Creative Center
4. **Plan 3-5 concrete steps** — Know what you'll do before you start acting.
5. **IMMEDIATELY START EXECUTING** — Do NOT just output a plan. Your first response must be an actual action (navigate, click, etc.) that begins the task. Combine your plan explanation into the "reasoning" field of your first action.

## CRITICAL RULES
1. **Prefer batched steps** — When you can plan 2-5 sequential actions confidently, return them all at once as a "steps" array. This is MUCH faster.
2. **No page context = navigate first** — If there is no page context, your first action MUST be a "navigate" to the RIGHT platform (not Google unless Google is genuinely the best tool).
3. **Never stop early** — Even if an action fails, try an alternative approach.
4. **ALWAYS respond with JSON** — You MUST respond with a JSON code block every single time.
5. **Be domain-smart** — Translate vague requests into expert-level actions. "Find winning products" → go to product research platforms, filter by trending/bestsellers, extract specific product data.

## Response Format
Prefer returning multiple steps at once when possible. Wrap in a markdown code block:

### Multi-step (PREFERRED — faster execution):
\`\`\`json
{
  "steps": [
    { "action": "navigate", "url": "https://...", "reasoning": "Going to target page", "done": false },
    { "action": "wait", "duration": 1500, "reasoning": "Wait for page load", "done": false },
    { "action": "click", "selector": ".trending-tab", "reasoning": "Switch to trending view", "done": false }
  ]
}
\`\`\`

### Single action (when you need to see the result before deciding next step):
\`\`\`json
{ "action": "navigate", "url": "https://...", "reasoning": "Going to target page", "done": false }
\`\`\`

### Action Types:
1. **click** — \`{ "action": "click", "selector": "CSS selector or description", "reasoning": "why", "done": false }\`
2. **type** — \`{ "action": "type", "selector": "CSS selector or description", "value": "text", "reasoning": "why", "done": false }\`
3. **navigate** — \`{ "action": "navigate", "url": "https://...", "reasoning": "why", "done": false }\`
4. **scroll** — \`{ "action": "scroll", "direction": "up|down", "amount": 500, "reasoning": "why", "done": false }\`
5. **extract** — \`{ "action": "extract", "selector": "CSS selector or description", "dataLabel": "what", "reasoning": "why", "done": false }\`
6. **wait** — \`{ "action": "wait", "duration": 1000, "reasoning": "why", "done": false }\`
7. **respond** — \`{ "action": "respond", "message": "your reply", "reasoning": "why", "done": false }\`
8. **done** — \`{ "action": "done", "message": "...", "reasoning": "all steps completed", "done": true }\`

## DONE MESSAGE FORMAT — CRITICAL
When you return "done", the "message" field MUST contain ALL the actual data/results the user asked for, formatted in clean markdown:
- **Product names, prices, links** — list them out
- **URLs found** — include full URLs
- **Images** — include image URLs as markdown images: ![description](url)
- **Text/content** — include the actual text found
- **Analysis** — include your analysis or recommendations
Do NOT just say "Task completed". The message IS the deliverable.

## SAFETY GUARDRAILS — ABSOLUTE RULES
${safetySettings?.integrityEnabled !== false ? `1. **NEVER make payments**
2. **NEVER sign up or create accounts**
3. **NEVER log in**
4. **NEVER enter sensitive data**
5. If you encounter any of the above, STOP and use "respond" to ask the user to handle it manually.` : "- Integrity guardrails are disabled. Still exercise caution with sensitive actions."}

## Guidelines
- Prefer multi-step responses (2-5 steps) when the sequence is predictable
- Return single actions when you need to see the page result first
- Set "done": true ONLY when the full task is completed
- Use CSS selectors when possible, fall back to descriptive text`;
}

function buildBrowserPrompt(pageSection: string, identity: string, relevantContext: string, safetySettings?: any): string {
  return `You are an AI embedded in a browser extension to automate the page. You can SEE the user's current page and perform actions on it. Do not call yourself an assistant, agent, or CEO — only refer to yourself as an AI if needed.

${identity ? `# Business Context\n${identity}` : ""}
${relevantContext}
${pageSection}

## DNA ALIGNMENT CONTRACT — MUST FOLLOW
Every action plan must align with the Business Operating Profile and Learning Signals above.
Include a short DNA-fit cue in each "reasoning" field.

## Your Capabilities
You analyze the user's request and the current page, then return a structured action plan the extension will execute.

## Response Format
Always respond with a JSON object wrapped in a markdown code block.

### Action Types:
1. **click** — \`{ "action": "click", "selector": "CSS selector or description", "reasoning": "why" }\`
2. **type** — \`{ "action": "type", "selector": "CSS selector or description", "value": "text to type", "reasoning": "why" }\`
3. **navigate** — \`{ "action": "navigate", "url": "https://...", "reasoning": "why" }\`
4. **scroll** — \`{ "action": "scroll", "direction": "up|down", "amount": 500, "reasoning": "why" }\`
5. **extract** — \`{ "action": "extract", "selector": "CSS selector or description", "dataLabel": "what this data is", "reasoning": "why" }\`
6. **wait** — \`{ "action": "wait", "duration": 1000, "reasoning": "why" }\`
7. **select** — \`{ "action": "select", "selector": "CSS selector", "value": "option value", "reasoning": "why" }\`
8. **copy** — \`{ "action": "copy", "text": "text to copy", "reasoning": "why" }\`
9. **respond** — \`{ "action": "respond", "message": "your reply", "reasoning": "why" }\`

### Multi-step tasks
\`\`\`json
{
  "steps": [
    { "action": "click", "selector": "#login-btn", "reasoning": "Open login form" },
    { "action": "wait", "duration": 500, "reasoning": "Wait for form" }
  ],
  "summary": "Brief description"
}
\`\`\`

## SAFETY GUARDRAILS
${safetySettings?.integrityEnabled !== false ? `- **NEVER** make payments, sign up, log in, or enter sensitive data.
- If you encounter any of the above, warn the user.` : "- Integrity guardrails are disabled. Still exercise caution."}

## Guidelines
- Use CSS selectors when possible
- Break complex tasks into small sequential steps
- If you cannot complete a task, use "respond" to ask for clarification
- Always include "reasoning"
- Warn before sensitive actions (delete, purchase, send)`;
}
