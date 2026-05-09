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
 *
 * Multiple [SUGGEST:...] blocks in a single message are now preserved as
 * SEPARATE question groups in `questions[]` so the UI can render multiple
 * question slides at once.  The flat `suggestions[]` field is the
 * concatenated convenience view (kept for backwards compatibility) — UI
 * code that wants "one slide per question" should iterate `questions`.
 */
export interface SuggestionGroup {
  /** Optional personal question / heading for the group. */
  title?: string;
  /** Options the user can pick (2-4 typical). Emojis preserved on labels. */
  suggestions: string[];
}

export interface ParsedSuggestions {
  content: string;
  /** Flat list of all suggestion options (concatenated across question groups). */
  suggestions: string[];
  /** First group's title, for backwards compatibility. */
  title?: string;
  /**
   * One entry per [SUGGEST:...] block the AI produced.  When the AI asks
   * multiple questions in a single message, each becomes its own group.
   */
  questions: SuggestionGroup[];
  planActions?: Array<{ label: string; prefill: string }>;
}

export function extractSuggestions(text: string): ParsedSuggestions {
  const questions: SuggestionGroup[] = [];
  const planActions: Array<{ label: string; prefill: string }> = [];

  // Standard [SUGGEST:...] tag (with optional markdown wrapping like
  // **[SUGGEST:...]**, `[SUGGEST:...]`, ```[SUGGEST:...]```, or surrounding
  // whitespace/newlines). Body is non-greedy and can span newlines.
  const suggestRegex = /\*{0,2}`{0,3}\[SUGGEST:\s*([\s\S]+?)\]\s*`{0,3}\*{0,2}/g;
  let match;
  while ((match = suggestRegex.exec(text)) !== null) {
    const raw = match[1];
    let body = raw;
    let groupTitle: string | undefined;
    const titleSplit = raw.split("::");
    if (titleSplit.length > 1) {
      const candidateTitle = titleSplit[0].trim();
      // Only treat as title if it looks like a question / sentence (not a single short option).
      if (candidateTitle.length > 0 && candidateTitle.length < 220) {
        groupTitle = candidateTitle;
        body = titleSplit.slice(1).join("::");
      }
    }
    const items = body.split("|").map((s) => s.trim()).filter(Boolean);
    if (items.length > 0) {
      questions.push({ title: groupTitle, suggestions: items.slice(0, 4) });
    }
  }
  let content = text.replace(suggestRegex, "").trim();

  // [PLAN_ACTION:Label::prefill text]
  const planActionRegex = /\*{0,2}`{0,3}\[PLAN_ACTION:\s*([\s\S]+?)\]\s*`{0,3}\*{0,2}/g;
  let paMatch;
  const planActionSuggestions: string[] = [];
  while ((paMatch = planActionRegex.exec(content)) !== null) {
    const raw = paMatch[1];
    const [labelRaw, ...prefillParts] = raw.split("::");
    const label = (labelRaw || "").trim();
    const prefill = prefillParts.join("::").trim();
    if (label) {
      planActions.push({ label, prefill: prefill || label });
      planActionSuggestions.push(label);
    }
  }
  content = content.replace(planActionRegex, "").trim();

  // Fold plan-action labels into the first question group (keeps legacy
  // single-card UX where plan actions appear as suggestions).
  if (planActionSuggestions.length > 0) {
    if (questions.length > 0) {
      questions[0] = {
        ...questions[0],
        suggestions: [...questions[0].suggestions, ...planActionSuggestions].slice(0, 4),
      };
    } else {
      questions.push({ suggestions: planActionSuggestions.slice(0, 4) });
    }
  }

  // Title fallback: if NO question group has a title, look for the last
  // question sentence in the cleaned content and use that as the title for
  // the first group.
  const firstGroup = questions[0];
  if (firstGroup && !firstGroup.title && content) {
    const tail = content
      .split(/\n+/)
      .slice(-6)
      .join(" ")
      .replace(/[#*_`>]+/g, " ")
      .trim();
    const questionMatch = tail.match(/([A-Z][^?!.\n]{8,160}\?)\s*$/);
    if (questionMatch) {
      questions[0] = { ...firstGroup, title: questionMatch[1].trim() };
    }
  }

  // Fallback: trailing numbered list (only when zero [SUGGEST:...] tags)
  if (questions.length === 0) {
    const trailingListRegex = /(?:\n\s*\d+\.\s+.+[\?\!]?\s*){2,5}$/;
    const listMatch = content.match(trailingListRegex);
    if (listMatch) {
      const listBlock = listMatch[0];
      const lineRegex = /\d+\.\s+(.+)/g;
      const items: string[] = [];
      let lineMatch;
      while ((lineMatch = lineRegex.exec(listBlock)) !== null) {
        const item = lineMatch[1].replace(/^\*{1,2}|[\*]{1,2}$/g, "").trim();
        if (item.length > 5 && item.length < 200) {
          items.push(item);
        }
      }
      if (items.length >= 2) {
        questions.push({ suggestions: items.slice(0, 4) });
        content = content.slice(0, content.length - listBlock.length).trim();
      }
    }
  }

  // Backwards-compat: flat suggestions = concatenation of all groups.
  // Capped at 4 to match the previous UI ceiling for the legacy single-card
  // path.  Multi-question UI uses `questions[]` directly and is uncapped at
  // the parser level (each group is independently capped at 4).
  const flat = questions.flatMap((g) => g.suggestions).slice(0, 4);
  const firstTitle = questions[0]?.title;

  return {
    content,
    suggestions: flat,
    title: firstTitle,
    questions,
    planActions: planActions.slice(0, 4),
  };
}
