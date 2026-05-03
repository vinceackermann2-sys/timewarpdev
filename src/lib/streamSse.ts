/**
 * Shared SSE parsing for extension-agent / run-employee style events
 * (`data: {JSON}` lines, optional `data: [DONE]`).
 */

import type { LiveSourceRegistry } from "./liveSourceRegistry";

function normalizeSseContentDelta(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in (part as object)) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return String(raw);
}

export type AgentSseProgressStep = {
  label: string;
  status: "running" | "done" | "error";
  action?: string;
  detail?: string;
};

export type DashboardCardsSsePayload = {
  cards?: unknown[];
  openingSummary?: string | null;
  healthScore?: unknown;
  tabs?: string[];
};

export type CreatedEntityPayload = {
  kind: "agent" | "employee";
  id?: string;
  name?: string;
};

export type PostFlightSsePayload = {
  score: number;
  confidence: string;
  warnings: string[];
};

export type PipelineSourcesPayload = {
  conclusionSources: Array<{ type: string; label: string; provider?: string; url?: string; snippet?: string }>;
  dataSources: Array<{ type: string; label: string; provider?: string; url?: string; snippet?: string }>;
};

export type AgentSseHandlers = {
  onProgressStep?: (step: AgentSseProgressStep) => void;
  onContentDelta?: (delta: string) => void;
  onResult?: (evt: { content?: string; continuation?: boolean; liveSourceRegistry?: LiveSourceRegistry; replyContract?: "direct" | "live_lookup" | "strategic_plan" }) => void;
  onLiveSources?: (registry: LiveSourceRegistry) => void;
  onDashboardCards?: (evt: DashboardCardsSsePayload) => void;
  onCreatedEntity?: (evt: CreatedEntityPayload) => void;
  onToolCall?: (evt: { name: string; args: Record<string, unknown> }) => void;
  onPostFlight?: (evt: PostFlightSsePayload) => void;
  onSources?: (evt: PipelineSourcesPayload) => void;
  onQuestions?: (questions: string[]) => void;
  onDashboardCardCreated?: (evt: { tab?: string; id?: string; title?: string }) => void;
  onErrorMessage?: (message: string) => void;
};

/** Consume `text/event-stream` bodies with `{ type: progress|content|result|error }` JSON payloads. */
export async function consumeAgentChatSseStream(
  response: Response,
  handlers: AgentSseHandlers,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        const evt = JSON.parse(raw);
        if (evt.type === "progress" && evt.step && handlers.onProgressStep) {
          handlers.onProgressStep(evt.step);
        } else if (evt.type === "content" && handlers.onContentDelta) {
          const d = normalizeSseContentDelta((evt as { delta?: unknown }).delta);
          if (d.length > 0) handlers.onContentDelta(d);
        } else if (evt.type === "dashboard_cards" && handlers.onDashboardCards) {
          handlers.onDashboardCards(evt as DashboardCardsSsePayload);
        } else if (evt.type === "live_sources" && evt.registry && handlers.onLiveSources) {
          handlers.onLiveSources(evt.registry as LiveSourceRegistry);
        } else if (evt.type === "created_entity" && handlers.onCreatedEntity) {
          handlers.onCreatedEntity(evt as CreatedEntityPayload);
        } else if (evt.type === "tool_call" && handlers.onToolCall) {
          handlers.onToolCall({
            name: String((evt as { name?: string }).name || ""),
            args: ((evt as { args?: Record<string, unknown> }).args || {}) as Record<string, unknown>,
          });
        } else if (evt.type === "post_flight" && handlers.onPostFlight) {
          const en = (evt as { enforcement?: PostFlightSsePayload }).enforcement;
          if (en && typeof en.score === "number") handlers.onPostFlight(en);
        } else if (evt.type === "sources" && handlers.onSources) {
          const c = (evt as { conclusionSources?: PipelineSourcesPayload["conclusionSources"] }).conclusionSources;
          const d = (evt as { dataSources?: PipelineSourcesPayload["dataSources"] }).dataSources;
          handlers.onSources({
            conclusionSources: Array.isArray(c) ? c : [],
            dataSources: Array.isArray(d) ? d : [],
          });
        } else if (evt.type === "questions" && handlers.onQuestions) {
          const qs = (evt as { questions?: string[] }).questions;
          if (Array.isArray(qs) && qs.length) handlers.onQuestions(qs);
        } else if (evt.type === "dashboard_card_created" && handlers.onDashboardCardCreated) {
          handlers.onDashboardCardCreated(evt as { tab?: string; id?: string; title?: string });
        } else if (evt.type === "result" && handlers.onResult) {
          handlers.onResult(evt);
        } else if (evt.type === "error") {
          const msg = evt.error || "Failed";
          handlers.onErrorMessage?.(msg);
          throw new Error(msg);
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        if (
          err.message === "Failed"
          || err.message === "Employee failed"
          || err.message?.includes("Error")
        ) throw e;
      }
    }
  }
  if (buffer.trim()) {
    const line = buffer.trim();
    if (line.startsWith("data: ")) {
      const raw = line.slice(6).trim();
      if (raw !== "[DONE]") {
        try {
          const evt = JSON.parse(raw);
          if (evt.type === "content" && handlers.onContentDelta) {
            const d = normalizeSseContentDelta((evt as { delta?: unknown }).delta);
            if (d.length > 0) handlers.onContentDelta(d);
          } else if (evt.type === "sources" && handlers.onSources) {
            const c = (evt as { conclusionSources?: PipelineSourcesPayload["conclusionSources"] }).conclusionSources;
            const d = (evt as { dataSources?: PipelineSourcesPayload["dataSources"] }).dataSources;
            handlers.onSources({
              conclusionSources: Array.isArray(c) ? c : [],
              dataSources: Array.isArray(d) ? d : [],
            });
          } else if (evt.type === "result" && handlers.onResult) {
            handlers.onResult(evt);
          } else if (evt.type === "error") {
            const msg = evt.error || "Failed";
            handlers.onErrorMessage?.(msg);
            throw new Error(msg);
          }
        } catch (e: unknown) {
          const err = e as { message?: string };
          if (
            err.message === "Failed"
            || err.message === "Employee failed"
            || err.message?.includes("Error")
          ) throw e;
        }
      }
    }
  }
}

/** OpenAI-compatible SSE: `data: {"choices":[{"delta":{"content":"..."}}]}` */
export async function consumeOpenAiStyleSseStream(
  response: Response,
  onDelta: (delta: string) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data.trim() === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = normalizeSseContentDelta(parsed.choices?.[0]?.delta?.content);
        if (delta.length > 0) onDelta(delta);
      } catch { /* partial JSON */ }
    }
  }
}
