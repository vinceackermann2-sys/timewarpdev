// Shared helper for computing the USD cost of an AI/API call so it can be
// passed to consumeWorkspaceAction. 1 action = $0.08 of cost.
//
// Token rates are per 1 million tokens, sourced from each model's public
// pricing. Rates are conservative ceilings — if the gateway markup is lower,
// users are slightly over-charged; if higher, slightly under-charged.

export interface ModelRate {
  inputPer1M: number;   // USD per 1M input tokens
  outputPer1M: number;  // USD per 1M output tokens
}

export const MODEL_RATES: Record<string, ModelRate> = {
  // Google Gemini family
  "google/gemini-3-flash-preview":      { inputPer1M: 0.30,  outputPer1M: 2.50 },
  "google/gemini-3.1-flash-image-preview": { inputPer1M: 0.30, outputPer1M: 2.50 },
  "google/gemini-3-pro-image-preview":  { inputPer1M: 1.25,  outputPer1M: 10.0 },
  "google/gemini-3.1-pro-preview":      { inputPer1M: 1.25,  outputPer1M: 10.0 },
  // OpenAI family
  "openai/gpt-5":      { inputPer1M: 1.25,  outputPer1M: 10.0 },
  "openai/gpt-5-mini": { inputPer1M: 0.25,  outputPer1M: 2.0 },
  "openai/gpt-5-nano": { inputPer1M: 0.05,  outputPer1M: 0.40 },
  "openai/gpt-5.2":    { inputPer1M: 2.50,  outputPer1M: 20.0 },
};

const FALLBACK_RATE: ModelRate = { inputPer1M: 0.30, outputPer1M: 2.50 };

// Fixed per-unit infra costs.
export const COST_PER_BROWSERBASE_MINUTE = 0.07; // USD
export const COST_PER_FIRECRAWL_PAGE = 0.002;    // USD
export const COST_PER_IMAGE_GENERATION = 0.04;   // USD per generated image

export interface AiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export function rateFor(model: string): ModelRate {
  return MODEL_RATES[model] ?? FALLBACK_RATE;
}

export function tokenCostUsd(model: string, usage: AiUsage | null | undefined): number {
  if (!usage) return 0;
  const rate = rateFor(model);
  const promptT = Number(usage.prompt_tokens ?? 0);
  const compT = Number(usage.completion_tokens ?? 0);
  return (promptT / 1_000_000) * rate.inputPer1M + (compT / 1_000_000) * rate.outputPer1M;
}

/** Rough chars-per-token heuristic (Gemini & GPT both average ~4). */
export function estimateTokens(text: string | undefined | null): number {
  if (!text) return 0;
  return Math.ceil(String(text).length / 4);
}

/**
 * Estimate the USD cost of an AI call BEFORE we run it (or when the response
 * is streamed and we can't easily count completion tokens). Works from prompt
 * text size + an assumed completion size.
 *
 * Defaults assume a reasonable medium-length response (~800 tokens).
 */
export function estimateAiCostUsd(opts: {
  model: string;
  promptText?: string;          // full prompt (system + history + user)
  promptTokens?: number;        // OR pass tokens directly
  estimatedCompletionTokens?: number; // expected response size in tokens
}): number {
  const rate = rateFor(opts.model);
  const promptT = opts.promptTokens ?? estimateTokens(opts.promptText);
  const compT = opts.estimatedCompletionTokens ?? 800;
  return (promptT / 1_000_000) * rate.inputPer1M + (compT / 1_000_000) * rate.outputPer1M;
}

export interface CallCost {
  ai?: { model: string; usage?: AiUsage | null }[];
  browserbaseMinutes?: number;
  firecrawlPages?: number;
  imagesGenerated?: number;
  /** Add any extra one-off USD cost (e.g. third-party API). */
  extraUsd?: number;
}

/** Compute total USD cost of a request from its measured components. */
export function computeCallCostUsd(parts: CallCost): number {
  let total = 0;
  for (const a of parts.ai ?? []) total += tokenCostUsd(a.model, a.usage);
  if (parts.browserbaseMinutes) total += parts.browserbaseMinutes * COST_PER_BROWSERBASE_MINUTE;
  if (parts.firecrawlPages) total += parts.firecrawlPages * COST_PER_FIRECRAWL_PAGE;
  if (parts.imagesGenerated) total += parts.imagesGenerated * COST_PER_IMAGE_GENERATION;
  if (parts.extraUsd) total += parts.extraUsd;
  return Math.max(0, total);
}
