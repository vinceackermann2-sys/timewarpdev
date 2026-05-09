---
name: Action Cost Model
description: 1 action = $0.08 of AI/API cost. Cost-based metering for all action consumption, with fractional actions stored as numeric.
type: feature
---
# Action Cost Model

**Formula:** 1 action = $0.08 of measured AI/API cost.
- A small chat msg costing $0.005 of AI = 0.0625 actions.
- A heavy multi-step browser run costing $0.30 = 3.75 actions.
- Default when no cost is passed = 1 action ($0.08).

## DB
- `workspace_subscriptions.actions_used` and `bonus_actions` are `numeric(12,4)`.
- `user_subscriptions.actions_used` and `bonus_actions` are `numeric(12,4)`.
- RPC `increment_workspace_actions(_workspace_id, _cost_usd default 0.08)` consumes `cost_usd / 0.08` actions.
- RPC `increment_actions_used(_user_id, _cost_usd default 0.08)` is the legacy per-user equivalent.
- Block rule: only blocks if remaining is already ≤ 0 BEFORE the call. Current call is always allowed to complete, but `actions_used` is clamped to `limit + bonus` so the balance NEVER goes negative — any overshoot is absorbed by us, not billed to the user.

## Edge functions
- Use `consumeWorkspaceAction(supabase, userId, workspaceId, costUsd?)` from `_shared/workspace-actions.ts`.
- Use `computeCallCostUsd({ ai: [{ model, usage }], browserbaseMinutes, firecrawlPages, imagesGenerated, extraUsd })` from `_shared/ai-cost.ts` to derive the cost from measured units.
- For multi-step runs (employees, agents, browser-agent): accumulate cost across all internal AI/Browserbase/Firecrawl/image calls, then call `consumeWorkspaceAction` ONCE at the end with the total.
- Per-token rates live in `MODEL_RATES` in `_shared/ai-cost.ts`. Update whenever a new model is added.

## UI
- Display `remaining` as decimal trimmed to 2 places (e.g. "87.25", "100", "12.5"), never as floor/round.
- `useActionGate.remaining` is `number | Infinity`.
