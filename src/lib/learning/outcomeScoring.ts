export function normalizeSigned(numerator: number, denominator: number, dampener = 4): number {
  const denom = Math.max((Number.isFinite(denominator) ? denominator : 0) + dampener, 1);
  const raw = (Number.isFinite(numerator) ? numerator : 0) / denom;
  return Math.max(-1, Math.min(1, raw));
}

export function compareWindowAverages(current: number[], previous: number[]): number {
  const avg = (arr: number[]) => {
    const nums = arr.filter((n) => Number.isFinite(n));
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  };
  return avg(current) - avg(previous);
}

const POSITIVE_SIGNAL_WORDS = [
  "closed won", "renewed", "approved", "great", "excellent", "happy", "thanks", "confirmed", "shipped", "on track", "recovered", "upside",
];
const NEGATIVE_SIGNAL_WORDS = [
  "churn", "cancel", "complaint", "blocked", "delay", "delayed", "missed", "issue", "escalated", "refund", "failed", "risk", "down",
];

function countSignalWords(text: string, words: string[]): number {
  const lower = (text || "").toLowerCase();
  let count = 0;
  for (const w of words) {
    if (lower.includes(w)) count++;
  }
  return count;
}

export function scoreIntegrationSignalText(text: string): { score: number; positiveHits: number; negativeHits: number; tags: string[] } {
  const positiveHits = countSignalWords(text, POSITIVE_SIGNAL_WORDS);
  const negativeHits = countSignalWords(text, NEGATIVE_SIGNAL_WORDS);
  const score = normalizeSigned(positiveHits - negativeHits, positiveHits + negativeHits, 3);

  const tags: string[] = [];
  if (positiveHits > 0) tags.push("positive-signal");
  if (negativeHits > 0) tags.push("negative-signal");

  return {
    score,
    positiveHits,
    negativeHits,
    tags,
  };
}
