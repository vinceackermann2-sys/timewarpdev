/**
 * Zod schemas for edge function JSON bodies (fail fast, consistent errors).
 */
import { z } from "npm:zod@3.25.76";

const messagePart = z.object({
  role: z.string(),
  content: z.union([z.string(), z.array(z.unknown()), z.record(z.unknown())]),
});

export const runEmployeeRequestSchema = z.object({
  employee_id: z.string().min(1),
  messages: z.array(messagePart).default([]),
  pageContext: z.any().optional().nullable(),
  skip_action: z.boolean().optional(),
  brandId: z.string().optional().nullable(),
  workspaceId: z.string().optional().nullable(),
  continuationContent: z.string().optional().nullable(),
  connectionQuery: z.string().optional().nullable(),
  sessionMemory: z.string().optional().nullable(),
  continuationKey: z.string().min(8).max(128).optional().nullable(),
  continuationIndex: z.number().int().min(0).max(100).optional(),
  taskType: z.enum(["chat", "crawl", "enrichment"]).optional(),
});

export type RunEmployeeRequest = z.infer<typeof runEmployeeRequestSchema>;

export const extensionAgentRequestSchema = z.object({
  messages: z.array(messagePart).default([]),
  pageContext: z.any().optional().nullable(),
  brandId: z.string().optional().nullable(),
  workspaceId: z.string().optional().nullable(),
  browserMode: z.boolean().optional(),
  sessionMemory: z.string().optional().nullable(),
  taskType: z.enum(["chat", "crawl", "enrichment"]).optional(),
});

export type ExtensionAgentRequest = z.infer<typeof extensionAgentRequestSchema>;

/** Unified assistant-chat: agent surface + optional employee (same fields as extension-agent ∪ run-employee). */
export const assistantChatRequestSchema = z.object({
  employee_id: z.string().min(1).optional().nullable(),
  messages: z.array(messagePart).default([]),
  pageContext: z.any().optional().nullable(),
  brandId: z.string().optional().nullable(),
  workspaceId: z.string().optional().nullable(),
  browserMode: z.boolean().optional(),
  sessionMemory: z.string().optional().nullable(),
  taskType: z.enum(["chat", "crawl", "enrichment"]).optional(),
  planMode: z.boolean().optional(),
  skip_action: z.boolean().optional(),
  continuationContent: z.string().optional().nullable(),
  connectionQuery: z.string().optional().nullable(),
  continuationKey: z.string().min(8).max(128).optional().nullable(),
  continuationIndex: z.number().int().min(0).max(100).optional(),
});

export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;

export const assistantInsightFeedbackRequestSchema = z.object({
  businessId: z.string().min(1),
  workspaceId: z.string().uuid().nullable().optional(),
  sentiment: z.enum(["helpful", "not_helpful"]),
  note: z.string().max(500).optional().nullable(),
  assistantExcerpt: z.string().min(1).max(1200),
  userContextSnippet: z.string().max(500).optional().nullable(),
});

export type AssistantInsightFeedbackRequest = z.infer<typeof assistantInsightFeedbackRequestSchema>;

export function safeParseJsonBody<T>(
  raw: unknown,
  schema: z.ZodType<T>,
): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { ok: false, error: msg || "Invalid request body" };
  }
  return { ok: true, data: parsed.data };
}
