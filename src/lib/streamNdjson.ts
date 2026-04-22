/**
 * NDJSON over HTTP (one JSON object per line), used by some edge functions (e.g. scrape-product).
 */

export async function consumeNdjsonStream(
  response: Response,
  onLine: (parsed: unknown, rawLine: string) => void,
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
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onLine(JSON.parse(trimmed), trimmed);
      } catch {
        /* ignore malformed line */
      }
    }
  }

  if (buffer.trim()) {
    try {
      onLine(JSON.parse(buffer.trim()), buffer.trim());
    } catch { /* ignore */ }
  }
}
