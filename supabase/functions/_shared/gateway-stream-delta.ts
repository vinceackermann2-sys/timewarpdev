/**
 * Lovable / OpenAI-compatible streams sometimes send `choices[0].delta.content`
 * as a string, an array of parts `{ text }`, or (rarely) other shapes.
 * Using `raw || ""` is wrong for `[]` (truthy but stringifies to nothing when coerced badly).
 */
export function normalizeChatCompletionDeltaContent(raw: unknown): string {
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
