/** Build multimodal message content from text that may contain image markers */
export function buildMultimodalContent(text: string): string | Record<string, unknown>[] {
  const IMAGE_MARKER = "__IMAGE_BASE64__";
  if (!text.includes(IMAGE_MARKER)) return text;

  const parts: Record<string, unknown>[] = [];
  let remaining = text;

  while (remaining.includes(IMAGE_MARKER)) {
    const markerStart = remaining.indexOf(IMAGE_MARKER);
    const beforeMarker = remaining.slice(0, markerStart).trim();
    if (beforeMarker) parts.push({ type: "text", text: beforeMarker });

    const afterMarker = remaining.slice(markerStart + IMAGE_MARKER.length);
    const mimeEnd = afterMarker.indexOf("__");
    const mimeType = afterMarker.slice(0, mimeEnd);
    const restAfterMime = afterMarker.slice(mimeEnd + 2);

    const nextMarker = restAfterMime.indexOf(IMAGE_MARKER);
    let base64: string;
    if (nextMarker >= 0) {
      base64 = restAfterMime.slice(0, nextMarker).trim();
      remaining = restAfterMime.slice(nextMarker);
    } else {
      base64 = restAfterMime.trim();
      remaining = "";
    }

    parts.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${base64}` },
    });
  }

  if (remaining.trim()) parts.push({ type: "text", text: remaining.trim() });
  return parts.length === 1 && parts[0].type === "text" ? (parts[0].text as string) : parts;
}
