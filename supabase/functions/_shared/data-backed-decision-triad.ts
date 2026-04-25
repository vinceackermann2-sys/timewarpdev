/**
 * Shared rules for any data-backed recommendation (DNA enrichment, assistants, chats).
 * Three evidence paths: internal history, verified external benchmark, user feedback.
 */
export const DATA_BACKED_DECISION_TRIAD = `
## Data-backed decisions — three evidence paths
For recommendations that depend on outcomes, growth, strategy, product priorities, or competitive moves, choose deliberately among these paths (you may combine them):

**Path 1 — Internal history (compare good vs weak periods)**  
Use when dashboard/objective metrics, CRM/support/comms integrations, or prior thread decisions show what improved or degraded. Contrast **recent vs prior windows** when possible. Treat integration text as qualitative signal only — quote or paraphrase what appears; never invent metrics.

**Path 2 — Verified external benchmark (adapt, do not blindly copy)**  
Use public, observable information only (ads pages, landing pages, help centers, pricing pages, press, app store copy). Before adopting a competitor or market pattern, verify **what** (artifact), **when** (freshness/launch window if visible), **where** (channel/surface), **how** (mechanism: e.g. for paid social — creative structure, message, cadence if inferable from public ads libraries). If verification cannot be completed from evidence, label the idea **unverified** and do not present it as validated best practice. Every external claim needs a **citable** pointer (URL/snippet from context). For **audience** insight without deep competitor work: prefer internal feedback/support/social signals; optional community-style public discussion is allowed only with the same citation rule.

**Path 3 — User feedback**  
Explicit user instructions, corrections, ratings, or uploaded evidence in this thread override weak inference. If the user has stated constraints or preferences, honor them and say when a path is blocked by that feedback.

**Output discipline**  
- Name which path(s) support each major recommendation when the answer is data-backed.  
- If internal metrics are sparse, say so and label forward plans as **hypothesis** until measured.  
- Never fabricate competitor performance numbers, ad spend, or engagement you did not see in supplied evidence.
`.trim();
