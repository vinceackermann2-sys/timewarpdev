import { normalizeChatCompletionDeltaContent } from "../gateway-stream-delta.ts";
import { runPostflightGuardrails } from "../guardrails.ts";
import { sanitizeAssistantAgainstLiveContext } from "../live-response-guard.ts";
import { logBusinessLearningEvent } from "../run-employee/business-brain.ts";
import { edgeLog, userIdShort } from "../edge-logger.ts";
import { buildAssistantPipelinePrompt } from "./context.ts";
import { runPostFlightEvidence } from "./post-flight.ts";
import { executeAssistantChatTool } from "./tools.ts";
import type { QuestionGateResult } from "../question-gate.ts";
import { classifyAssistantGoal } from "./goalSetter.ts";
import { buildConnectorProgressLabel } from "./personalLogger.ts";

export interface AssistantChatStreamInput {
  supabase: any;
  user: { id: string };
  messages: any[];
  brandId?: string | null;
  workspaceId?: string | null;
  sessionMemory?: string | null;
  taskType: string;
  lastUserMsg: string;
  userMsg: unknown;
  safetySettings: any;
  replyContract: "direct" | "live_lookup" | "strategic_plan";
  businessId: string | null | undefined;
  profileContext: string;
  questionGate?: QuestionGateResult;
  planMode?: boolean;
}

type AccumulatedToolCall = { id?: string; name: string; arguments: string };

function parseGatewayEvent(
  eventBlock: string,
  onDelta: (delta: string) => void,
  toolCalls?: Map<number, AccumulatedToolCall>,
) {
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
    } catch { /* partial */ }
  }
}

export function createAssistantChatSseResponse(input: AssistantChatStreamInput, corsHeaders: Record<string, string>): Response {
  const {
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
    planMode,
  } = input;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[assistant-chat-stream] SSE starting", JSON.stringify({
    userId: user?.id?.slice(0, 8),
    brandId: (brandId as string | undefined)?.slice(0, 8) ?? null,
    workspaceId: (workspaceId as string | undefined)?.slice(0, 8) ?? null,
    taskType,
    replyContract,
    msgChars: typeof lastUserMsg === "string" ? lastUserMsg.length : 0,
    historyLen: Array.isArray(messages) ? messages.length : 0,
    hasQuestionGate: !!questionGate,
    ts: new Date().toISOString(),
  }));
  edgeLog("assistant-chat", "sse_start", {
    user: user?.id?.slice(0, 8),
    taskType,
    replyContract,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          return true;
        } catch {
          closed = true;
          return false;
        }
      };
      const sendStep = (label: string, status: "running" | "done" | "error", action = "process", detail?: string) => {
        send({ type: "progress", step: { label, status, action, detail } });
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch { /* client disconnected */ }
      };
      const heartbeat = setInterval(() => {
        if (!send({ type: "progress", step: { label: "Still working…", status: "running", action: "heartbeat" } })) {
          clearInterval(heartbeat);
        }
      }, 15000);

      (async () => {
        try {
          // Immediate ack so the UI shows activity before the pipeline kicks in.
          sendStep("Reading your message…", "running", "thinking");
          sendStep("Reading your message…", "done", "thinking");
          sendStep("Thinking…", "running", "thinking");
          if (
            !planMode &&
            questionGate &&
            !questionGate.complete &&
            !questionGate.isAnswerToPriorQuestion &&
            questionGate.mandatoryQuestions?.length
          ) {
            // Emit the questions as structured chips so the AssistantSuggestions
            // card renders them above the chat input (not as prose in the bubble).
            const qs = questionGate.mandatoryQuestions.slice(0, 3);
            send({ type: "questions", questions: qs });
            sendStep("Thinking…", "done", "thinking");
            sendStep("Need clarification", "done", "question");
            
            const questionText = qs.length === 1 
              ? qs[0] 
              : qs.map((q, i) => `${i + 1}. ${q}`).join("\n");
              
            send({
              type: "result",
              content: `I need a quick clarification before I answer:\n\n${questionText}`,
              replyContract,
            });
            close();
            return;
          }

          sendStep("Thinking…", "done", "thinking");
          const {
            systemPrompt,
            offerTools,
            tools,
            sourceRegistry,
            connectionContext,
            connectionDecision,
            searchedProviders,
            skippedProviderDetails,
            queryTopic,
          } = await buildAssistantPipelinePrompt({
            supabase,
            userId: user.id,
            brandId,
            workspaceId,
            lastUserMsg,
            messages,
            taskType,
            sessionMemory,
            replyContract,
            send,
            sendStep,
          });

          supabase.from("timewarp_chats").insert({
            user_id: user.id,
            user_message: typeof userMsg === "string" ? userMsg : JSON.stringify(userMsg),
            page_url: null,
          }).then(() => {});

          const streamGoal = classifyAssistantGoal(lastUserMsg);
          const craft = buildConnectorProgressLabel("llm", streamGoal);
          if (replyContract === "strategic_plan") {
            sendStep("Building strategic plan…", "running", "response");
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
                reasoning: { effort: "high" },
                messages: msgs,
                stream: true,
                temperature: 0.2,
                top_p: 0.9,
                ...(includeTools ? { tools, tool_choice: "auto" } : {}),
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

          const planModeDirective = planMode
            ? `\n\n## ⚡ PLAN MODE ENABLED (user toggled the Planning chip)\nThe user explicitly enabled Planning mode. You MUST deliver a complete, thoroughly-researched strategic plan in this single reply — do not stop to ask clarifying questions. If information is missing, make reasonable assumptions and label them clearly ("Assumption:"). Use the FULL strategic_plan structure with all required sections (Plan Overview, First-Principles Breakdown, Evidence Base, Strategic Options & Trade-offs, 30/60/90 Execution Plan, KPI Tree, Risks & Validation Tests, Confidence & Data Gaps). The complete plan markdown MUST be wrapped in [PLAN_ARTIFACT]…[/PLAN_ARTIFACT] so the user can open it as a document. Do NOT skip the artifact wrapper — it is mandatory in plan mode. Aim for depth: at least 700 words inside the artifact.`
            : "";
          const finalSystemPrompt = systemPrompt + planModeDirective;
          const initialMessages = [{ role: "system", content: finalSystemPrompt }, ...messages];
          const response = await callGateway(initialMessages, offerTools);
          if (!response.ok) {
            const status = response.status;
            const errorBody = await response.text().catch(() => "");
            console.error("AI gateway error:", status, errorBody.slice(0, 200));
            if (status === 429) throw new Error("Rate limit exceeded.");
            if (status === 402) throw new Error("AI credits exhausted.");
            throw new Error("AI service unavailable");
          }

          const first = await consumeStream(response, { collectToolCalls: offerTools });
          let fullContent = first.content;

          if (first.toolCalls.length > 0) {
            sendStep("Running tools", "running", "context");
            const toolResults: { tool_call_id: string; name: string; result: any }[] = [];
            for (const tc of first.toolCalls) {
              let parsedArgs: any = {};
              try {
                parsedArgs = JSON.parse(tc.arguments);
              } catch {
                console.error("[assistant-chat] bad tool args", tc.arguments?.slice(0, 200));
              }
              send({ type: "tool_call", name: tc.name, args: parsedArgs });
              const result = await executeAssistantChatTool(tc.name, parsedArgs, {
                supabase,
                userId: user.id,
                workspaceId,
                brandId,
              });
              edgeLog("assistant-chat", "tool_executed", { name: tc.name, user: userIdShort(user.id) });
              if (result && typeof result === "object" && (result as { ok?: boolean }).ok === true) {
                if (tc.name === "create_agent" || tc.name === "create_employee") {
                  send({
                    type: "created_entity",
                    kind: (result as { kind?: string }).kind,
                    id: (result as { id?: string }).id,
                    name: (result as { name?: string }).name,
                  });
                }
                if (
                  (tc.name === "create_todo" || tc.name === "create_objective" || tc.name === "create_briefing" ||
                    tc.name === "create_update") && (result as { kind?: string }).kind === "dashboard"
                ) {
                  send({
                    type: "dashboard_card_created",
                    tab: (result as { tab?: string }).tab,
                    id: (result as { id?: string }).id,
                    title: (result as { name?: string }).name,
                  });
                }
              }
              toolResults.push({
                tool_call_id: tc.id || `${tc.name}_${Math.random().toString(36).slice(2, 8)}`,
                name: tc.name,
                result,
              });
            }
            sendStep("Running tools", "done", "context");

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
              const okOnes = toolResults.filter((t) => t.result?.ok);
              if (okOnes.length > 0) {
                const line = okOnes.map((t) => `✅ Tool **${t.name}** completed.`).join("\n");
                fullContent = (fullContent ? fullContent + "\n\n" : "") + line;
                send({ type: "content", delta: (fullContent ? "\n\n" : "") + line });
              }
            }
          }

          let finalContent = runPostflightGuardrails(fullContent, safetySettings);
          finalContent = sanitizeAssistantAgainstLiveContext(finalContent, connectionContext || "");
          const enforcement = runPostFlightEvidence(finalContent);
          send({
            type: "post_flight",
            enforcement: {
              score: enforcement.score,
              confidence: enforcement.confidence,
              warnings: enforcement.warnings,
            },
          });

          sendStep(craft.label, "done", craft.action);
          sendStep("Finished", "done", "complete");
          await logBusinessLearningEvent(supabase, {
            userId: user.id,
            workspaceId,
            businessId: businessId || brandId,
            agentSurface: "assistant-chat",
            mode: "chat",
            userMessage: lastUserMsg,
            assistantResponse: finalContent,
            profileContext,
            metadata: {
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
            queryTopic,
            liveSourceRegistry: sourceRegistry,
          });
          clearInterval(heartbeat);
          close();
        } catch (error: any) {
          clearInterval(heartbeat);
          edgeLog("assistant-chat", "stream_error", { message: String(error?.message || error) });
          console.error("assistant-chat stream error:", error?.message || error);
          send({ type: "error", error: error?.message || "An internal error occurred" });
          close();
        }
      })();
    },
    cancel() {
      // The browser intentionally closed the stream (cancel / navigation / watchdog).
      // `send()` is guarded above so late async completions do not throw uncaught
      // "stream controller cannot close or enqueue" errors.
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
