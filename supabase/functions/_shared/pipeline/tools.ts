import { workforceTools, executeWorkforceToolCall } from "../workforce-tools.ts";
import { upsertAssistantMemoryRow } from "./memory.ts";
import { fetchPublicWebSnapshot } from "../public-web-snapshot.ts";

export const memoryWriteTool = {
  type: "function" as const,
  function: {
    name: "memory_write",
    description:
      "Persist a durable decision or preference for this user/workspace so future sessions remember it. Call only for decisions worth remembering (positioning, budget band, channel choice, ICP, etc.).",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Snake_case identifier, e.g. campaign_target_audience" },
        value: { type: "string", description: "Short plain-text value to recall later" },
        category: { type: "string", description: "decision | preference | general" },
      },
      required: ["key", "value"],
      additionalProperties: false,
    },
  },
};

export const webSearchTool = {
  type: "function" as const,
  function: {
    name: "web_search",
    description:
      "Fetch a bounded public web snapshot for competitive or market context. Use when the user needs external facts not in DNA or connectors.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Focused search query" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

export function buildAssistantChatTools() {
  return [...workforceTools, memoryWriteTool, webSearchTool];
}

export interface AssistantToolCtx {
  supabase: any;
  userId: string;
  workspaceId?: string | null;
  brandId?: string | null;
}

export async function executeAssistantChatTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AssistantToolCtx,
): Promise<Record<string, unknown>> {
  if (name === "memory_write") {
    const r = await upsertAssistantMemoryRow(
      ctx.supabase,
      ctx.userId,
      ctx.workspaceId,
      String(args.key || ""),
      String(args.value || ""),
      String(args.category || "decision"),
      "assistant",
    );
    return r;
  }
  if (name === "web_search") {
    const q = String(args.query || "").trim();
    if (!q) return { ok: false, error: "empty query" };
    const snap = await fetchPublicWebSnapshot(q);
    return { ok: true, snapshot: snap || "" };
  }
  return executeWorkforceToolCall(name, args, {
    supabase: ctx.supabase,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId || undefined,
    brandId: ctx.brandId || undefined,
  }) as unknown as Record<string, unknown>;
}
