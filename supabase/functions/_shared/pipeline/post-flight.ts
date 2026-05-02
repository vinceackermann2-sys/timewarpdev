/** Server-side checks after the model finishes (complements client evidenceAudit). */

export interface PostFlightResult {
  score: number;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

export function runPostFlightEvidence(content: string): PostFlightResult {
  const text = content || "";
  const warnings: string[] = [];

  const substantive = text.replace(/\s+/g, " ").trim().length > 24;
  if (substantive && !/```assistant_sources[\s\S]*?```/m.test(text)) {
    warnings.push("Missing assistant_sources fence on substantive reply.");
  }
  if (/\[PLAN_ARTIFACT\]/i.test(text) && !/\[\/PLAN_ARTIFACT\]/i.test(text)) {
    warnings.push("Unclosed PLAN_ARTIFACT wrapper.");
  }
  if (/\[SUGGEST:/i.test(text) && !/::/i.test(text)) {
    warnings.push("Malformed [SUGGEST:] tag (missing ::).");
  }

  const score = Math.max(0, 100 - warnings.length * 20);
  const confidence: PostFlightResult["confidence"] =
    warnings.length === 0 ? "high" : warnings.length === 1 ? "medium" : "low";
  return { score, confidence, warnings };
}
