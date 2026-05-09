/**
 * Detect user-stated metrics that may conflict with live connector snippets (lightweight).
 */

const USER_MONEY_RE = /\b(\$?\s*[\d,.]+\s*[kKmM]?)\s*(mrr|arr|revenue)\b/gi;
const CONTEXT_MONEY_RE = /\b(\$?\s*[\d,.]+\s*[kKmM]?)\s*(mrr|arr|revenue)\b/gi;

function normalizeMoneyToken(s: string): string {
  return s.replace(/\$/g, "").replace(/\s+/g, "").toLowerCase();
}

export function buildDataIntegrityChallengeBlock(userMessage: string, connectionContext: string): string {
  const um = String(userMessage || "");
  const ctx = String(connectionContext || "").slice(0, 12000);
  if (!um || !ctx) return "";

  const userHits: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(USER_MONEY_RE.source, USER_MONEY_RE.flags);
  while ((m = re.exec(um)) !== null) {
    userHits.push(`${m[1]} ${m[2]}`);
  }
  if (userHits.length === 0) return "";

  const ctxHits: string[] = [];
  const re2 = new RegExp(CONTEXT_MONEY_RE.source, CONTEXT_MONEY_RE.flags);
  while ((m = re2.exec(ctx)) !== null) {
    ctxHits.push(`${m[1]} ${m[2]}`);
  }
  if (ctxHits.length === 0) return "";

  const u0 = normalizeMoneyToken(userHits[0]);
  const c0 = normalizeMoneyToken(ctxHits[0]);
  if (!u0 || !c0 || u0 === c0) return "";

  return [
    "## Data integrity challenge",
    `The user stated: **${userHits[0]}**`,
    `Live connector context includes: **${ctxHits[0]}**`,
    "",
    "If these refer to the same metric, acknowledge the discrepancy honestly, ask which figure is authoritative, and do not silently pick one.",
  ].join("\n");
}
