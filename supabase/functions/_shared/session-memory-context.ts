/** User-editable notes persisted with the chat; injected into model context. */
export function formatSessionMemoryBlock(sessionMemory: unknown): string {
  const s = typeof sessionMemory === "string" ? sessionMemory.trim() : "";
  if (!s) return "";
  return `\n\n## Session memory (user notes, authoritative for this thread)\n${s}\n`;
}
