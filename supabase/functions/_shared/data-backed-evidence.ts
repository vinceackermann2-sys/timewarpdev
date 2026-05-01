import type { AssistantReplyContract } from "./assistant-reply-contract.ts";

export function buildDataBackedRoutingBlock(opts: {
  replyContract: AssistantReplyContract;
  liveLookupRan: boolean;
  webSnapshotRan: boolean;
}): string {
  const { replyContract, liveLookupRan, webSnapshotRan } = opts;

  const modeLine =
    replyContract === "live_lookup"
      ? "This turn is **live_lookup**: lead with connector results when the Connected Sources section has rows."
      : replyContract === "strategic_plan"
        ? "This turn is **strategic_plan**: use the plan artifact rules; cite Internal vs External vs Feedback inside the plan where claims are made."
        : "This turn is **direct**: still ground factual claims, but skip heavy plan scaffolding unless the user asked for it.";

  return `
## Data-backed answer contract (three tiers)

You must ground recommendations and factual claims using the tiers below. When tiers conflict, **Internal verified facts win** over External; **explicit user Feedback** (including session memory) wins over generic priors when it is a preference or correction.

### 1 — Internal
- Business DNA and structured profile in Reference Material
- Files or long context the user pasted in **this thread**
- **Connected Sources (Live Search Results)** — Gmail, Drive/Docs/Sheets, Calendar, Slack, HubSpot, Stripe, Microsoft 365, etc.
- **Dashboard snapshot** and **Performance Evidence / KPI windows** when present
- **Learning signals** in the business brain context — use them to compare what historically **helped vs hurt** outcomes and say so when relevant
- **Injected skill playbooks** — methodology only; do not treat playbook text as private business facts

### 2 — External
- **Public web snapshot** block (when present) — competitors, public companies, market/news-style facts
- Never relabel External facts as the user's private operational data

### 3 — Feedback
- The user's messages in **this thread**, explicit constraints, and the **Session memory** block
- User corrections override earlier model assumptions in the same thread

### This request (server routing)
- **Live integrations:** ${liveLookupRan ? "queried this turn because the message matched mail/files/calendar/CRM/chat/metrics-in-tools intent." : "not queried this turn — only use live rows if they still appear from a prior turn; otherwise say data was not pulled."}
- **Public web snapshot:** ${webSnapshotRan ? "fetched this turn — use it for competitive/public claims and cite it." : "not fetched — do not claim you ran a live web search; use Internal + reasoning and label uncertainty."}

${modeLine}
`.trim();
}
