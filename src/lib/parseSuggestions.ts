/**
 * Robust parser for AI-generated follow-up suggestions.
 *
 * Supported formats (preferred → legacy):
 *   1. [SUGGEST:Personal question to the user?::📣 Reach|💰 Sales|👥 Leads]
 *      → title = "Personal question to the user?"
 *      → suggestions[] each with leading emoji preserved in the label
 *   2. [SUGGEST:📣 Reach|💰 Sales|👥 Leads]   (no title)
 *   3. [SUGGEST:A|B|C]                         (plain, legacy)
 *   4. Trailing numbered list (fallback)
 */
export interface ParsedSuggestions {
  content: string;
  suggestions: string[];
  title?: string;
}

export function extractSuggestions(text: string): ParsedSuggestions {
  const suggestions: string[] = [];
  let title: string | undefined;

  // Standard [SUGGEST:...] tag (with optional markdown wrapping like **[SUGGEST:...]**, `[SUGGEST:...]`, ```[SUGGEST:...]```, or surrounding whitespace/newlines)
  // The body is non-greedy and can span newlines, so multi-line tags still parse.
  const suggestRegex = /\*{0,2}`{0,3}\[SUGGEST:\s*([\s\S]+?)\]\s*`{0,3}\*{0,2}/g;
  let match;
  while ((match = suggestRegex.exec(text)) !== null) {
    const raw = match[1];
    // Optional title prefix delimited by "::"
    let body = raw;
    const titleSplit = raw.split("::");
    if (titleSplit.length > 1) {
      const candidateTitle = titleSplit[0].trim();
      // Only treat as title if it looks like a question / sentence (not a single short option).
      if (candidateTitle.length > 0 && candidateTitle.length < 140) {
        title = candidateTitle;
        body = titleSplit.slice(1).join("::");
      }
    }
    const items = body.split("|").map((s) => s.trim()).filter(Boolean);
    suggestions.push(...items);
  }
  let content = text.replace(suggestRegex, "").trim();

  // Title fallback: if the AI didn't include one in the tag, look for the last
  // question sentence in the cleaned content and use that as the personal title.
  if (!title && suggestions.length > 0 && content) {
    // Strip markdown emphasis/headings from the tail before scanning.
    const tail = content
      .split(/\n+/)
      .slice(-6) // look at last few lines only
      .join(" ")
      .replace(/[#*_`>]+/g, " ")
      .trim();
    // Find the LAST '?' terminated sentence.
    const questionMatch = tail.match(/([A-Z][^?!.\n]{8,160}\?)\s*$/);
    if (questionMatch) {
      title = questionMatch[1].trim();
    }
  }

  // Fallback: trailing numbered list
  if (suggestions.length === 0) {
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
        suggestions.length = 0;
      }
    }
  }

  return { content, suggestions: suggestions.slice(0, 4), title };
}
