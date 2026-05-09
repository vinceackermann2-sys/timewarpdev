export type GraphicType = "Document" | "Graph" | "Analytics" | "Spreadsheet" | "Slide";

export interface GraphicGateResult {
  suggestGraphic: boolean;
  graphicType: GraphicType | null;
  autoApply: boolean;
  reason?: string;
}

/**
 * Returns a graphic type only when the user clearly asked for that deliverable.
 * Never used for silent/auto injection — avoids unprompted charts and decks.
 */
export function detectUserRequestedGraphicType(message: string): GraphicType | null {
  const text = (message || "").trim();
  if (!text) return null;

  const asksVisual =
    /\b(create|make|generate|build|draft|design|produce)\b/i.test(text) ||
    /\b(i need|i want|give me|show me)\b/i.test(text);
  if (!asksVisual) return null;

  if (/\b(slide|deck|presentation|pitch\s+deck)\b/i.test(text)) return "Slide";
  if (/\b(spreadsheet|worksheet|excel|csv|table\s+of\s+data)\b/i.test(text)) return "Spreadsheet";
  if (/\b(chart|graph|plot|visuali[sz]e|bar chart|line chart|pie chart)\b/i.test(text)) return "Graph";
  if (/\b(analytics\s+dashboard|dashboard|metrics\s+panel|kpi\s+dashboard)\b/i.test(text)) return "Analytics";
  if (/\b(document|memo|brief|proposal|report|write-?up|one-?pager)\b/i.test(text)) return "Document";

  return null;
}

/** @deprecated Prefer detectUserRequestedGraphicType — kept for any legacy callers */
export function runGraphicGate(message: string, intentHint?: string): GraphicGateResult {
  const type = detectUserRequestedGraphicType(`${message || ""} ${intentHint || ""}`.trim());
  if (type) {
    return { suggestGraphic: true, graphicType: type, autoApply: false, reason: "explicit-user-request" };
  }
  return { suggestGraphic: false, graphicType: null, autoApply: false };
}
