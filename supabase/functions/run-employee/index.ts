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
import { classifyAssistantReplyContract } from "../_shared/assistant-reply-contract.ts";
import { formatSessionMemoryBlock } from "../_shared/session-memory-context.ts";
import { sanitizeAssistantAgainstLiveContext } from "../_shared/live-response-guard.ts";
import {
  buildBusinessBrainContext,
  logBusinessLearningEvent,
} from "../_shared/run-employee/business-brain.ts";
import {
  runPreflightGuardrails,
  runPostflightGuardrails,
  validateActionPayload,
  validateBrowserActions,
} from "../_shared/guardrails.ts";
import { runEmployeeRequestSchema, safeParseJsonBody } from "../_shared/edge-request-schemas.ts";
import { edgeLog, userIdShort } from "../_shared/edge-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const parsedBody = safeParseJsonBody(jsonBody, runEmployeeRequestSchema);
    if (!parsedBody.ok) {
      return new Response(JSON.stringify({ error: parsedBody.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const {
      employee_id,
      messages,
      pageContext,
      skip_action,
      brandId,
      workspaceId,
      continuationContent,
      connectionQuery,
      sessionMemory,
      continuationKey,
      continuationIndex = 0,
      taskType = "chat",
    } = parsedBody.data;

    edgeLog("run-employee", "request", {
      user: userIdShort(user.id),
      employee: employee_id.slice(0, 8),
      browser: !!pageContext,
    });

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

    const lastUserMsg = extractLastUserMessage(messages ?? []);
    const replyContract = classifyAssistantReplyContract(lastUserMsg);
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
    let restoredContinuation = continuationContent || "";
    if (!restoredContinuation && continuationKey) {
      const { data: cp } = await supabase
        .from("long_task_checkpoints")
        .select("content")
        .eq("continuation_key", continuationKey)
        .maybeSingle();
      restoredContinuation = cp?.content || "";
    }
    if (restoredContinuation) {
      effectiveMessages.push({ role: "assistant", content: restoredContinuation });
      effectiveMessages.push({ role: "user", content: "Continue exactly where you left off. Do not repeat what you already wrote." });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const memoryBlock = formatSessionMemoryBlock(sessionMemory);

    const upsertLongTaskRun = async (patch: {
      status?: "queued" | "in_progress" | "completed" | "failed";
      phase?: string;
      progress?: number;
      logLine?: string;
      resultExcerpt?: string;
      error?: string;
    }) => {
      if (!continuationKey) return;
      const { data: existing } = await supabase
        .from("long_task_runs")
        .select("id, logs")
        .eq("continuation_key", continuationKey)
        .maybeSingle();
      const priorLogs = Array.isArray(existing?.logs) ? existing.logs : [];
      const nextLogs = patch.logLine
        ? [...priorLogs.slice(-39), { at: new Date().toISOString(), phase: patch.phase || "running", message: patch.logLine }]
        : priorLogs;
      await supabase.from("long_task_runs").upsert({
        id: existing?.id,
        user_id: user.id,
        workspace_id: (workspaceId || employee.workspace_id) || null,
        business_id: businessId || effectiveBrandId || null,
        continuation_key: continuationKey,
        task_type: taskType,
        status: patch.status || "in_progress",
        phase: patch.phase || "running",
        progress: typeof patch.progress === "number" ? patch.progress : undefined,
        logs: nextLogs,
        result_excerpt: patch.resultExcerpt || undefined,
        error: patch.error || undefined,
        updated_at: new Date().toISOString(),
      }, { onConflict: "continuation_key" });
    };

    const upsertCheckpoint = async (content: string, metadata: Record<string, unknown>) => {
      if (!continuationKey) return;
      const { data: run } = await supabase
        .from("long_task_runs")
        .select("id")
        .eq("continuation_key", continuationKey)
        .maybeSingle();
      if (!run?.id) return;
      await supabase.from("long_task_checkpoints").upsert({
        run_id: run.id,
        continuation_key: continuationKey,
        continuation_index: continuationIndex,
        content: content || "",
        metadata,
        updated_at: new Date().toISOString(),
      }, { onConflict: "continuation_key" });
    };

    await upsertLongTaskRun({
      status: "in_progress",
      phase: "discover",
      progress: 5,
      logLine: continuationIndex > 0 ? `Resuming continuation ${continuationIndex}` : "Started long task run",
    });

    const buildAiResponse = async (
      relevantContext: string,
      connectionContext: string,
      emitContent?: (delta: string) => void,
    ) => {
      const fullContext = `${profileContext}\n${learningContext}${memoryBlock}${relevantContext}${connectionContext}`;
      const systemPrompt = isBrowserMode
        ? buildBrowserSystemPrompt(employee, identity, fullContext, pageContext, safetySettings)
        : buildEmployeeChatPrompt(employee, identity, fullContext, safetySettings, replyContract);

      const TIMEOUT_MS = taskType === "enrichment" ? 150_000 : taskType === "crawl" ? 120_000 : 90_000;
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

      let content = (restoredContinuation || "") + fullContent;
      content = runPostflightGuardrails(content, safetySettings);
      if (!isBrowserMode) {
        content = sanitizeAssistantAgainstLiveContext(content, connectionContext);
      }
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
      }

      await upsertCheckpoint(content, {
        continuationIndex,
        timedOut,
        taskType,
        mode: isBrowserMode ? "browser" : "chat",
        employeeId: employee_id,
        lastUserMessage: lastUserMsg,
      });
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
        metadata: {
          queryTopic,
          searchedProviders,
          skippedProviders,
          reply_contract: replyContract,
          plan_generated: /\[PLAN_ARTIFACT\]/i.test(result.content || ""),
          outcome: result.continuation ? "negative" : "positive",
        },
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
          let heartbeat: ReturnType<typeof setInterval> | null = null;
          try {
            const topic = extractQueryTopic(connectionLookupQuery);
            heartbeat = setInterval(() => {
              send({ type: "progress", step: { label: "Still working on this task...", status: "running", action: "heartbeat", detail: "Long task heartbeat" } });
            }, 8000);
            sendStep(`Reading what you asked about ${topic}`, "running", "analysis");
            await upsertLongTaskRun({ phase: "discover", progress: 12, logLine: `Parsed task topic: ${topic}` });
            const decision = shouldSearchConnections(connectionLookupQuery);
            sendStep(`Got it — you want help with ${topic}`, "done", "analysis", decision.reason);

            sendStep(`Pulling your business context on ${topic}`, "running", "context");
            await upsertLongTaskRun({ phase: "analyze", progress: 28, logLine: "Loading context and integrations" });
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
              const verifiedOut = sanitizeAssistantAgainstLiveContext(preVerifiedContent, connectionContext);
              send({ type: "content", delta: verifiedOut });
              result = { content: verifiedOut, continuation: false };
              sendStep(`Used verified numbers for ${topic}`, "done", "response");
            } else {
              sendStep(`Writing your answer on ${topic}`, "running", "response");
              await upsertLongTaskRun({ phase: "synthesize", progress: 62, logLine: "Generating response" });
              result = await buildAiResponse(relevantContext, connectionContext, (delta) => {
                send({ type: "content", delta });
              });
              sendStep(`Wrote your answer on ${topic}`, "done", "response");
            }
            if (!result.continuation) sendStep("All done — here's what I found", "done", "complete");
            await upsertLongTaskRun({
              status: result.continuation ? "in_progress" : "completed",
              phase: result.continuation ? "synthesize" : "completed",
              progress: result.continuation ? 92 : 100,
              resultExcerpt: (result.content || "").slice(0, 1400),
              logLine: result.continuation ? "Timed window reached, continuation required" : "Task completed",
            });
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
              metadata: {
                queryTopic,
                searchedProviders,
                skippedProviders,
                connectionDecision,
                reply_contract: replyContract,
                plan_generated: /\[PLAN_ARTIFACT\]/i.test(result.content || ""),
                outcome: result.continuation ? "negative" : "positive",
              },
            });

            send({ type: "result", ...result, searchedProviders, skippedProviders, skippedProviderDetails, connectionDecision, queryTopic });
            if (heartbeat) clearInterval(heartbeat);
            close();
          } catch (error: any) {
            edgeLog("run-employee", "stream_error", { message: String(error?.message || error) });
            console.error("run-employee stream error:", error?.message || error);
            await upsertLongTaskRun({
              status: "failed",
              phase: "failed",
              error: String(error?.message || error),
              logLine: "Task failed",
            });
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
  } catch (e: any) {
    edgeLog("run-employee", "handler_error", { message: String(e?.message || e) });
    console.error("run-employee error:", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
