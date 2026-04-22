import { shouldSearchConnections } from "./connection-search-decision.ts";

/** How the assistant should structure and ground its reply (ACIM-style routing). */
export type AssistantReplyContract = "live_lookup" | "direct";

/**
 * Classify reply contract from the user's latest text.
 * - `live_lookup` — same intent as connector search (see connection-search-decision triggers).
 * - `direct` — default: answer in natural form, no fixed CEO section template.
 */
export function classifyAssistantReplyContract(userQuery: string): AssistantReplyContract {
  const { shouldSearch } = shouldSearchConnections(userQuery);
  return shouldSearch ? "live_lookup" : "direct";
}
