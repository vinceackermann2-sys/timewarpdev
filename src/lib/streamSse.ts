/**
 * Shared SSE parsing for extension-agent / run-employee style events
 * (`data: {JSON}` lines, optional `data: [DONE]`).
 */

import type { LiveSourceRegistry } from "./liveSourceRegistry";

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

export type AgentSseHandlers = {
  onProgressStep?: (step: AgentSseProgressStep) => void;
  onContentDelta?: (delta: string) => void;
  onResult?: (evt: { content?: string; continuation?: boolean; liveSourceRegistry?: LiveSourceRegistry; replyContract?: "direct" | "live_lookup" | "strategic_plan" }) => void;
  onLiveSources?: (registry: LiveSourceRegistry) => void;
  onDashboardCards?: (evt: DashboardCardsSsePayload) => void;
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
        } else if (evt.type === "content" && evt.delta && handlers.onContentDelta) {
          handlers.onContentDelta(evt.delta);
        } else if (evt.type === "dashboard_cards" && handlers.onDashboardCards) {
          handlers.onDashboardCards(evt as DashboardCardsSsePayload);
        } else if (evt.type === "live_sources" && evt.registry && handlers.onLiveSources) {
          handlers.onLiveSources(evt.registry as LiveSourceRegistry);
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
        const delta = parsed.choices?.[0]?.delta?.content || "";
        if (delta) onDelta(delta);
      } catch { /* partial JSON */ }
    }
  }
}
