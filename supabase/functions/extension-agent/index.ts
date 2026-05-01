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
import { classifyAssistantReplyContract } from "../_shared/assistant-reply-contract.ts";
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
import { matchSkill, matchSkillSticky, buildSkillBlock } from "../_shared/skills/_router.ts";
import { workforceTools, executeWorkforceToolCall } from "../_shared/workforce-tools.ts";

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

    // Check and increment action usage against the active workspace's shared pool
    const requestedWorkspaceId = (jsonBody as any)?.workspaceId ?? null;
    const { consumeWorkspaceAction } = await import("../_shared/workspace-actions.ts");
    const usage = await consumeWorkspaceAction(supabase, user.id, requestedWorkspaceId);
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
    const replyContract = classifyAssistantReplyContract(lastUserMsg);
    const { businessId, profileContext, learningContext } = await buildBusinessBrainContext(supabase, {
      userId: user.id,
      brandId,
      workspaceId,
    });
    const questionGate = runQuestionGate({ message: lastUserMsg, profileContext });
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
      const { connectionContext, sourceRegistry, searchedProviders, skippedProviderDetails, connectionDecision, queryTopic } = await searchConnectedProviders(
        supabase,
        user.id,
        lastUserMsg,
        undefined,
        topic,
      );

      const pageSection = buildPageSection();
      const fullContext = `${profileContext}\n${learningContext}${memoryBlock}${relevantContext}${connectionContext}${dnaRouterBlock ? `\n${dnaRouterBlock}` : ""}${performanceEvidence ? `\n\n## Performance Evidence (KPI Windows)\n${performanceEvidence}` : ""}${questionGateBlock ? `\n\n${questionGateBlock}` : ""}\n\n## Evidence Paths\n- Path 1 Internal History: ${performanceEvidence ? "available" : "sparse"}\n- Path 2 External Benchmark: use connected sources with citations only\n- Path 3 User Feedback: honor explicit constraints and ratings`;
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
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) onDelta(delta);
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
          let heartbeat: ReturnType<typeof setInterval> | null = null;
          try {
            // Short, cool sub-log labels — no echoing the user's question.
            // Use a tightly truncated topic only when it's a clean noun phrase.
            const shortTopic = (() => {
              const t = (topic || "").trim().replace(/^(how|what|why|when|where|who|do|does|can|should|is|are)\b[^a-z0-9]*/i, "");
              const words = t.split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
              return words.length > 0 && words.length <= 28 ? words : "";
            })();
            const isDnaTopic = /\b(dna|brand|audience|product|positioning|business model)\b/i.test(topic);
            const understandPhrases = isDnaTopic ? [
              "Reading your Business DNA",
              "Tuning into your Business DNA",
              "Aligning Business DNA",
            ] : [
              "Reading the room",
              "Locking the angle",
              "Framing the ask",
              "Sharpening focus",
              "Decoding intent",
            ];
            const gatherPhrases = isDnaTopic ? [
              "Pulling DNA threads",
              "Cross-checking your DNA",
              "Walking your DNA",
            ] : [
              "Pulling the receipts",
              "Digging your numbers",
              "Sweeping for signals",
              "Stitching the facts",
              "Mining your data",
            ];
            const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
            const understandLabel = pick(understandPhrases);
            const gatherLabel = pick(gatherPhrases);

            // Emit immediately so UI shows sub-logging without delay
            sendStep(understandLabel, "running", "analysis");

            sendStep(understandLabel, "done", "analysis", initialConnectionDecision.reason);

            sendStep(gatherLabel, "running", "context");
            const relevantContext = await retrieveRelevantContext(supabase, user.id, workspaceId, lastUserMsg, brandId, browserMode);
            sendStep(gatherLabel, "done", "context");

            const { connectionContext, sourceRegistry, searchedProviders, skippedProviderDetails, connectionDecision, queryTopic } = await searchConnectedProviders(
              supabase,
              user.id,
              lastUserMsg,
              (step) => send({ type: "progress", step }),
              topic,
            );
            if (sourceRegistry && Object.keys(sourceRegistry).length > 0) {
              send({ type: "live_sources", registry: sourceRegistry });
            }

            let dashboardMarkdown = "";
            if (brandId && lastUserMsg && taskType === "chat" && !pageContext) {
              sendStep("Dashboard snapshot", "running", "context");
              const dash = await resolveDashboardCardsForChat(supabase, {
                userId: user.id,
                brandId,
                userMessage: lastUserMsg,
                send,
              });
              dashboardMarkdown = dash.markdown;
              sendStep("Dashboard snapshot", "done", "context");
            }

            const answerTopic = queryTopic || topic;
            const pageSection = buildPageSection();
            const hasBrowserContext = !!pageContext;
            const fullContext = `${profileContext}\n${learningContext}${memoryBlock}${relevantContext}${connectionContext}${dashboardMarkdown}${dnaRouterBlock ? `\n${dnaRouterBlock}` : ""}${performanceEvidence ? `\n\n## Performance Evidence (KPI Windows)\n${performanceEvidence}` : ""}${questionGateBlock ? `\n\n${questionGateBlock}` : ""}\n\n## Evidence Paths\n- Path 1 Internal History: ${performanceEvidence ? "available" : "sparse"}\n- Path 2 External Benchmark: use connected sources with citations only\n- Path 3 User Feedback: honor explicit constraints and ratings`;
            // Skill routing (Layer 4a) — match against last user message,
            // and fall back to recent history so multi-turn wizards (agent/
            // employee creation) stay active when the user replies with a
            // short SUGGEST chip that carries no trigger keywords.
            const matchedSkill = !hasBrowserContext ? matchSkillSticky(messages) : null;
            if (matchedSkill) {
              edgeLog("extension-agent", "skill_matched", { slug: matchedSkill.slug, name: matchedSkill.name });
              sendStep(`Loading ${matchedSkill.name} playbook`, "done", "context");
            }
            const skillBlock = matchedSkill ? buildSkillBlock(matchedSkill) : "";
            const systemPrompt = hasBrowserContext
              ? buildBrowserPrompt(pageSection, identity, fullContext, safetySettings)
              : buildChatPrompt(identity, fullContext + skillBlock, replyContract);

            supabase.from("timewarp_chats").insert({
              user_id: user.id,
              user_message: typeof userMsg === "string" ? userMsg : JSON.stringify(userMsg),
              page_url: pageContext?.url || null,
            }).then(() => {});

            const isAnswerDna = /\b(dna|brand|audience|product|positioning|business model)\b/i.test(answerTopic);
            const craftPhrases = isAnswerDna ? [
              "Drafting your DNA take",
              "Writing the DNA read",
              "Shaping the DNA call",
            ] : [
              "Building your move",
              "Sketching the play",
              "Writing the take",
              "Pulling the call",
              "Loading the answer",
            ];
            const craftLabel = craftPhrases[Math.floor(Math.random() * craftPhrases.length)];
            if (replyContract === "strategic_plan") {
              sendStep("Building strategic plan...", "running", "response");
            }
            sendStep(craftLabel, "running", "response");
            heartbeat = setInterval(() => {
              send({ type: "progress", step: { label: "Still working on this task...", status: "running", action: "heartbeat", detail: `Task type: ${taskType}` } });
            }, 8000);
            // Workforce tools are only offered in pure chat mode (no browser
            // pageContext). Browser mode already returns its own JSON action
            // envelope and shouldn't be confused by extra tool calls.
            const offerWorkforceTools = !hasBrowserContext;

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
                  ...(includeTools ? { tools: workforceTools, tool_choice: "auto" } : {}),
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
                const result = await executeWorkforceToolCall(tc.name, parsedArgs, {
                  supabase,
                  userId: user.id,
                  workspaceId,
                  brandId,
                });
                edgeLog("extension-agent", "workforce_tool_executed", {
                  name: tc.name, ok: result.ok, id: result.id, error: result.error,
                });
                if (result.ok) {
                  send({
                    type: "created_entity",
                    kind: result.kind,
                    id: result.id,
                    name: result.name,
                  });
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
                    .map((t) => `✅ Created ${t.result.kind} **${t.result.name}**.`)
                    .join("\n");
                  fullContent = (fullContent ? fullContent + "\n\n" : "") + line;
                  send({ type: "content", delta: (fullContent ? "\n\n" : "") + line });
                }
              }
            }

            let finalContent = runPostflightGuardrails(fullContent, safetySettings);
            finalContent = sanitizeAssistantAgainstLiveContext(finalContent, connectionContext);
            sendStep(craftLabel, "done", "response");
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
            if (heartbeat) clearInterval(heartbeat);
            close();
          } catch (error: any) {
            edgeLog("extension-agent", "stream_error", { message: String(error?.message || error) });
            console.error("extension-agent stream error:", error?.message || error);
            if (heartbeat) clearInterval(heartbeat);
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

function buildChatPrompt(identity: string, relevantContext: string, replyContract: "live_lookup" | "direct" | "strategic_plan"): string {
  const grounding = buildAssistantGroundingBlock(replyContract);
  const responseShape = replyContract === "live_lookup"
    ? `
## Response shape (live data first)
Lead with what you found (or did not find) in live connector results. Then add only the context needed from Business DNA or profile. Do not bury the answer.`.trim()
    : replyContract === "strategic_plan"
    ? `
## Response shape (advanced strategic plan)
Produce a first-principles, evidence-backed strategy plan for heavy business questions.
- Include explicit data-source labels (Business DNA, integrations/live connectors, dashboard/objective outcomes, external/public evidence, user input).
- Do not fabricate metrics; mark uncertainty if evidence is missing.
- Include 30/60/90 execution, KPI tree, risks, and validation tests.
- Wrap the full plan markdown in:
[PLAN_ARTIFACT]
...plan...
[/PLAN_ARTIFACT]`.trim()
    : `
## Response shape (default)
Answer the user's question in the most natural structure for that question — prose, bullets, or a small table when comparisons need it. No mandatory section template.`.trim();

  return `You are an AI that helps with business strategy and execution — decisive, analytical, and willing to challenge weak assumptions. You help with strategy, marketing, content creation, analysis, operations, and decision-making.

${identity ? `# Business Context\n${identity}\n\n**IMPORTANT: You are currently representing ONLY this business. All your answers must be about this specific business. Do NOT reference or provide information about any other business the user may own.**` : ""}
${relevantContext}

${grounding}

${responseShape}

## Your Personality & Approach (The 7 Traits)
1. **Decisive** — Give clear recommendations, not wishy-washy "it depends" answers. Pick a direction and defend it.
2. **Contrarian** — Do NOT blindly agree. If the user's idea is flawed, say so directly and explain why with data. Challenge weak assumptions.
3. **Data-Grounded** — Always back opinions with specific numbers, metrics, benchmarks, or evidence from the user's data. Never fabricate metrics.
4. **Constructive** — When you disagree, ALWAYS propose a better alternative. Criticism without solutions is useless.
5. **Strategic** — Think like a strategist: consider ROI, opportunity cost, market timing, competitive dynamics, and second-order effects.
6. **Direct** — Be honest. Sugarcoating wastes time. Get to the point fast.
7. **Contextual** — When you agree, explain WHY with supporting evidence — don't just say "great idea."

## CRITICAL CHAT BEHAVIOR
1. **ALWAYS answer the user's actual question first.** This is your #1 priority.
2. If the user attached files, analyze that specific content and answer their question about it.
3. Reference material above contains verified business data. When creating any pitch, presentation, report, slide, document, graph, chart, analytics output, spreadsheet, or visual deliverable, you MUST use this data to personalize the content. For general questions, reference it when relevant.
4. Do NOT summarize business context unprompted. Do NOT start responses with business overviews.
5. Never refer to yourself as a CEO, AI CEO, executive, assistant, agent, employee, or any role title — only as an AI if you must name what you are.
6. Never mention "RAG", "knowledge files", or "knowledge base".
7. **NEVER fabricate or invent business data.** If the Reference Material does not contain specific numbers, do NOT make them up. Ask the user to provide them.
8. When the Reference Material includes brand, product, or audience records, always cross-check your response against those records for accuracy before answering.
9. When the user asks for a pitch, presentation, report, document, graph, chart, analytics output, spreadsheet, or any creative deliverable, ALWAYS base the content on the business's brand, product, and audience data from the Reference Material. Treat every request as being about THIS business unless the user explicitly says otherwise. Never create generic content.

## ANTI-PATTERNS — NEVER DO THESE
- **No Blind Agreement**: Never say "Great idea!" without explaining why with data. Evaluate every suggestion objectively.
- **No Generic Content**: Never produce boilerplate content that could apply to any business. Every output must reference THIS user's specific data.
- **No Fabricated Metrics**: If you don't have the data, say so and ask. Never invent numbers, percentages, or benchmarks.
- **No "I don't have access" for stored content**: The Reference Material content IS provided to you. If a specific stored item has no content, say "This item hasn't been analyzed yet" instead. **EXCEPTION for LIVE data (emails, files, documents, calendar events, CRM records, messages, meetings):** if the user asks for live items (e.g. "my last 5 documents", "recent emails", "upcoming meetings") and there is NO "Live Connection Data" section in the Reference Material, you MUST say you couldn't pull that live data right now and ask the user to rephrase or check that the relevant integration (Gmail, Drive, Calendar, HubSpot, etc.) is connected. **NEVER invent file names, document titles, email subjects, meeting titles, contacts, or any other live items. Fabricating live data is a critical failure.**
- **No Unsolicited Overviews**: Never start with "Based on your business data..." summaries. Answer the question directly.
- **No Hedging Without Reasoning**: If you're uncertain, explain why — don't just say "it depends" without clarifying on what.
- **No Empty Validation**: Every agreement must come with supporting evidence or reasoning.
- **No Bracket Placeholders**: NEVER ship text containing square-bracket fill-ins like \`[Insert Number]\`, \`[Product Category]\`, \`[Company Name]\`, \`[X%]\`, \`[Date]\`, \`[Your Audience]\`, \`[TBD]\`, etc. If you don't have a real value from the Reference Material or live data, either (a) compute/derive it, (b) state the specific number/name is missing and ask one targeted question, or (c) omit that sentence entirely. Brackets-as-placeholders are a critical failure — your output must read as a finished deliverable, not a template.

## QUALITY SCORING CRITERIA
Aim to maximize quality across these dimensions:
- **Data Grounding (30%)**: Reference specific numbers, dates, names from the user's data
- **Actionability (20%)**: Provide clear, implementable next steps
- **Format Richness (15%)**: Use tables, blockquotes, headers, and structured formatting
- **Specificity (15%)**: Avoid vague language — use precise terms and concrete details
- **Personality (10%)**: Use a direct, contrarian tone when evidence supports pushback — without adopting a persona title
- **Suggestion Quality (10%)**: End with relevant, thought-provoking follow-up questions

## FORMATTING
- Use ## and ### headings only when they help scan longer answers — not for every short reply
- Use **bold** for key terms and important takeaways
- Use markdown tables when presenting comparisons, metrics, or lists of items with attributes — skip tables for one-off factual answers that do not need them
- Use bullet points for lists and key takeaways
- Use > blockquotes for key insights or important findings
- Use --- to separate major sections in longer responses
- Add blank lines between sections
- Keep paragraphs short (2-3 sentences max)
- When comparing options, ALWAYS use a table with pros/cons or criteria columns

## VISUAL OUTPUT RULES — CRITICAL
**Do NOT generate \`\`\`chart, \`\`\`slide, \`\`\`document, \`\`\`spreadsheet, or \`\`\`analytics code blocks UNLESS the user's message explicitly contains a "🎨 Output format:" instruction requesting a specific visual format.** If there is no such instruction, respond with plain markdown text only. Never proactively create graphics, slides, charts, or visual outputs on your own initiative.

When the user's message DOES contain "🎨 Output format:", follow these rules:

For slides use a \`\`\`slide code block. **VARY the layout per slide** — choose from "stat-callout", "bullets", "two-column" (with "left_column" and "right_column" arrays), or "title-only" based on what fits the content. Do NOT use the same template every time. When the user asks for a deck, presentation, or multiple slides, output MULTIPLE separate \`\`\`slide blocks back-to-back (typically 3-7), each with a layout that fits its content:
\`\`\`slide
{"title":"Title","subtitle":"Context","layout":"stat-callout","icon":"🚀","stats":[{"value":"$2.4M","label":"ARR"}],"takeaway":"Key insight","accent_color":"#3399ff","bg_color":"#1a1a2e","brand_name":"Acme"}
\`\`\`
\`\`\`slide
{"title":"Comparison","layout":"two-column","left_column":["Pro 1","Pro 2"],"right_column":["Con 1","Con 2"],"accent_color":"#3399ff","bg_color":"#1a1a2e"}
\`\`\`

For documents use a \`\`\`document code block:
\`\`\`document
{"title":"Title","sections":[{"heading":"Section","content":"Content"}],"date":"..."}
\`\`\`

For spreadsheets use a \`\`\`spreadsheet code block:
\`\`\`spreadsheet
{"title":"Title","headers":["Col1","Col2"],"rows":[["A","B"]],"footer":["Total","100"]}
\`\`\`

For analytics dashboards use a \`\`\`analytics code block:
\`\`\`analytics
{"title":"Title","metrics":[{"label":"Metric","value":"100","change":5.2}],"insights":["Insight"]}
\`\`\`

For charts use a \`\`\`chart code block:
\`\`\`chart
{"type":"bar","title":"Chart Title","xKey":"label","yKeys":["value"],"data":[{"label":"A","value":10}]}
\`\`\`
Supported chart types: bar, line, area, pie.

## CLARIFYING QUESTIONS — MUST USE [SUGGEST:] TAG, NEVER PROSE
**HARD RULE:** Any time you ask the user a clarifying question, the question MUST be inside a \`[SUGGEST:Question?::Option 1|Option 2|Option 3]\` tag. NEVER ask a clarifying question as plain prose, a markdown bullet, or a trailing "?" sentence in the body. The UI renders \`[SUGGEST:]\` as a clickable card — questions outside the tag are invisible to the user as actionable choices and look broken.

If your reply contains a "?" directed at the user (anything like "Which would you like…", "Do you want me to…", "Should I…", "What's your goal…", "Which option…"), that question MUST be the title of a \`[SUGGEST:]\` tag with 2–4 concrete clickable options. No exceptions.

**INCLUDE a \`[SUGGEST:...]\` tag when:**
- The request is ambiguous on a critical dimension (goal, audience, channel, timeframe, budget, success metric, scope) AND knowing the answer would change your output materially.
- You need to pick between 2–4 distinct directions before you can give a high-quality answer.

**DO NOT include a \`[SUGGEST:...]\` tag when:**
- You already have enough context to answer well — just answer.
- The reply is a confirmation, acknowledgement, short factual answer, error message, or live-data lookup result.
- You'd be inventing a question just to fill the slot ("Want me to keep going?", "Anything else?", "How can I help?" — all FORBIDDEN).
- The user asked a specific factual or executional question that you can answer directly.

**Format (only when used):**
\`[SUGGEST:Your real clarifying question?::EMOJI Option 1|EMOJI Option 2|EMOJI Option 3|EMOJI Option 4]\`
- Title before \`::\` MUST be a real personal clarifying question tied to this conversation. Generic placeholders are FORBIDDEN.
- The \`::\` separator is REQUIRED. After \`::\`, list **2 to 4** distinct concrete answers the user can pick, each prefixed with ONE fitting emoji (📣 reach, 💰 sales, 👥 leads, 📅 timing, 🎯 targeting, etc.).
- Raw tag on its own line — no markdown wrapping.

Example (only when a real clarification is needed): \`[SUGGEST:What's the goal of this campaign?::📣 Reach — get seen by more people|💰 Sales — get more customers|👥 Leads — get signups]\`**`;
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
