/**
 * Robust parser for AI clarifying questions and plan actions.
 *
 * NEW SIMPLIFIED RULES (questions redo):
 *   1. A [SUGGEST:Question?::Opt1|Opt2|Opt3] block is ONLY treated as a
 *      clarifying question when the title (everything before `::`) ends
 *      with a `?`.  Tag-less or title-less SUGGEST blocks are ignored
 *      entirely — they used to produce ghost/empty question chips.
 *   2. [PLAN_ACTION:Label::prefill] blocks are parsed separately and are
 *      NEVER folded into question groups.  They surface as next-step chips
 *      inside the assistant body, not as clarifying questions.
 *   3. No tail-of-message inference.  No phantom questions from random
 *      trailing sentences or numbered lists — questions must be explicit.
 *
 * Result: the question UI only fires when the model truly asked a
 * clarifying question, and only LLM-supplied options are shown to the
 * user (plus the always-present "Something else — type your answer").
 */

export interface SuggestionGroup {
  /** The clarifying question itself, ending with `?`. */
  title: string;
  /** Options the user can pick (0–4 typical). Emojis preserved on labels. */
  suggestions: string[];
}

export interface ParsedSuggestions {
  content: string;
  /** Flat list of all option labels (concatenated across question groups). */
  suggestions: string[];
  /** First question's title, for backwards compatibility. */
  title?: string;
  /** One entry per real `[SUGGEST:Question?::...]` block. */
  questions: SuggestionGroup[];
  planActions?: Array<{ label: string; prefill: string }>;
}

const SUGGEST_TAG_RE =
  /\*{0,2}`{0,3}\[SUGGEST:\s*([\s\S]+?)\]\s*`{0,3}\*{0,2}/g;
const PLAN_ACTION_TAG_RE =
  /\*{0,2}`{0,3}\[PLAN_ACTION:\s*([\s\S]+?)\]\s*`{0,3}\*{0,2}/g;

export function extractSuggestions(text: string): ParsedSuggestions {
  const questions: SuggestionGroup[] = [];
  const planActions: Array<{ label: string; prefill: string }> = [];

  // Pass 1: real clarifying questions — title MUST end with `?`.
  let m: RegExpExecArray | null;
  while ((m = SUGGEST_TAG_RE.exec(text)) !== null) {
    const raw = m[1];
    const titleSplit = raw.split("::");
    if (titleSplit.length < 2) continue; // no `Title::Options` shape — skip
    const title = titleSplit[0].trim();
    if (!title || title.length > 220) continue;
    if (!/\?\s*$/.test(title)) continue; // not a question — skip
    const body = titleSplit.slice(1).join("::");
    const items = body
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 120)
      .slice(0, 4);
    questions.push({ title, suggestions: items });
  }
  let content = text.replace(SUGGEST_TAG_RE, "").trim();

  // Pass 2: plan actions (separate concept; NOT folded into questions).
  let pa: RegExpExecArray | null;
  while ((pa = PLAN_ACTION_TAG_RE.exec(content)) !== null) {
    const raw = pa[1];
    const [labelRaw, ...prefillParts] = raw.split("::");
    const label = (labelRaw || "").trim();
    const prefill = prefillParts.join("::").trim();
    if (label) planActions.push({ label, prefill: prefill || label });
  }
  content = content.replace(PLAN_ACTION_TAG_RE, "").trim();

  const flat = questions.flatMap((g) => g.suggestions).slice(0, 4);
  return {
    content,
    suggestions: flat,
    title: questions[0]?.title,
    questions,
    planActions: planActions.slice(0, 8),
  };
}
