export type GraphicType = "Document" | "Graph" | "Analytics" | "Spreadsheet" | "Slide";

export interface GraphicGateResult {
  suggestGraphic: boolean;
  graphicType: GraphicType | null;
  autoApply: boolean;
  reason?: string;
}

const RULES: Array<{ re: RegExp; type: GraphicType; autoApply: boolean; reason: string }> = [
  { re: /\b(show|visualize|visualise|chart|graph)\b.*\b(revenue|sales|breakdown|trend|funnel|kpi|metrics?)\b/i, type: "Graph", autoApply: true, reason: "chart-intent" },
  { re: /\b(compare|vs\.?|versus|breakdown of)\b/i, type: "Graph", autoApply: true, reason: "comparison-intent" },
  { re: /\b(slide|deck|presentation)\b/i, type: "Slide", autoApply: true, reason: "slide-intent" },
  { re: /\b(report|document|proposal)\b/i, type: "Document", autoApply: true, reason: "document-intent" },
  { re: /\b(numbers?|metrics?|kpis?|dashboard)\b/i, type: "Analytics", autoApply: true, reason: "analytics-intent" },
  { re: /\b(table|spreadsheet|sheet)\b/i, type: "Spreadsheet", autoApply: true, reason: "tabular-intent" },
];

export function runGraphicGate(message: string, intentHint?: string): GraphicGateResult {
  const text = `${message || ""} ${intentHint || ""}`.trim();
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      return { suggestGraphic: true, graphicType: rule.type, autoApply: rule.autoApply, reason: rule.reason };
    }
  }

  if (/\b(strategy|plan|roadmap|gtm|go to market|growth)\b/i.test(text) && /\b(data|metrics?|kpi|revenue|cac|ltv)\b/i.test(text)) {
    return { suggestGraphic: true, graphicType: "Graph", autoApply: false, reason: "strategy-with-data" };
  }

  return { suggestGraphic: false, graphicType: null, autoApply: false };
}
