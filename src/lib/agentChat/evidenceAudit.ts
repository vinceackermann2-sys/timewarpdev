export interface EvidenceAuditResult {
  score: number;
  status: "pass" | "warn";
  warnings: string[];
}

function countNumericClaims(text: string): number {
  const matches = text.match(/\b\d+(?:\.\d+)?%?\b/g);
  return matches ? matches.length : 0;
}

export function runEvidenceAudit(assistantContent: string, knownContextFragments: string[]): EvidenceAuditResult {
  const warnings: string[] = [];
  const text = assistantContent || "";
  const lower = text.toLowerCase();

  const hasEvidenceMap = /evidence map|evidence_json|\{\s*"sources"/i.test(text);
  if (!hasEvidenceMap) warnings.push("Missing explicit evidence map block.");

  const numericClaims = countNumericClaims(text);
  const contextBlob = knownContextFragments.join("\n").toLowerCase();
  if (numericClaims >= 6) {
    const hasKnownNumbers = /\d/.test(contextBlob);
    if (!hasKnownNumbers) warnings.push("High number density with weak numeric source context.");
  }

  if (/benchmark|industry average|typically|usually/i.test(lower) && !/http|https|citation|source/i.test(lower)) {
    warnings.push("Benchmark language without obvious citation.");
  }

  const score = Math.max(0, 100 - warnings.length * 25);
  return {
    score,
    status: warnings.length ? "warn" : "pass",
    warnings,
  };
}
