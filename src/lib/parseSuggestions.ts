/**
 * Robust parser for AI-generated follow-up suggestions.
 * Handles multiple formats the AI may produce:
 * 1. [SUGGEST:A|B|C]
 * 2. Numbered list at the end (1. Question? 2. Question? 3. Question?)
 * 3. Markdown bold/italic wrapping around the tag
 */
export function extractSuggestions(text: string): { content: string; suggestions: string[] } {
  const suggestions: string[] = [];

  // 1. Standard [SUGGEST:...] tag (with optional markdown wrapping like **[SUGGEST:...]**, `[SUGGEST:...]`, or newlines)
  const suggestRegex = /\*{0,2}`{0,3}\[SUGGEST:\s*([^\]]+)\]\s*`{0,3}\*{0,2}/g;
  let match;
  while ((match = suggestRegex.exec(text)) !== null) {
    const items = match[1].split("|").map(s => s.trim()).filter(Boolean);
    suggestions.push(...items);
  }
  let content = text.replace(suggestRegex, "").trim();

  // 2. If no suggestions found via tag, try numbered list at end of response
  if (suggestions.length === 0) {
    // Match a trailing block of 2-5 numbered items (e.g. "1. How can I...?\n2. What about...?")
    const trailingListRegex = /(?:\n\s*\d+\.\s+.+[\?\!]?\s*){2,5}$/;
    const listMatch = content.match(trailingListRegex);
    if (listMatch) {
      const listBlock = listMatch[0];
      const lineRegex = /\d+\.\s+(.+)/g;
      let lineMatch;
      while ((lineMatch = lineRegex.exec(listBlock)) !== null) {
        const item = lineMatch[1].replace(/^\*{1,2}|[\*]{1,2}$/g, "").trim();
        if (item.length > 5 && item.length < 200) {
          suggestions.push(item);
        }
      }
      if (suggestions.length >= 2) {
        content = content.slice(0, content.length - listBlock.length).trim();
      } else {
        suggestions.length = 0; // Not confident enough, discard
      }
    }
  }

  return { content, suggestions: suggestions.slice(0, 3) };
}
