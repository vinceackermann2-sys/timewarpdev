## Performance & resilience pass — triaged

I'll group the 8 items by risk/value. Some are safe wins I'll ship; two are bigger architectural shifts I want your sign-off on before doing them; one is a dashboard toggle only you can flip.

---

### Ship now (safe, high ROI)

**1. Composite DB indexes on `user_business_data`**
- New migration adding the indexes that match how the app actually queries:
  - `(workspace_id, data_type, created_at DESC)` — covers DNA/dashboard list reads
  - `(workspace_id, source)` — connector-sourced filters
  - `(user_id, data_type, created_at DESC)` — personal/legacy reads
  - `(workspace_id, is_analyzed)` — enrichment scans
- Existing indexes (`user_id`, `workspace_id`, `(workspace_id, data_type, source)`) stay; new ones use `IF NOT EXISTS`. Zero risk.

**2. Parallelize pre-flight queries in `_shared/run-employee/http-handler.ts`**
- Today, between the auth check and the AI call we serially run: load employee → membership RPC → action availability → load identity → safety settings → business brain context → checkpoint restore.
- Fix: keep auth + employee load first (membership depends on employee), then `Promise.all` the independent ones (`checkWorkspaceActionsAvailable`, `loadBusinessIdentity`, `loadAccountSafetySettings`, `buildBusinessBrainContext`, checkpoint fetch). Saves ~300–600ms per call.
- Same pattern applied to `assistant-chat/index.ts` if it has a comparable preflight.

**3. Cache subscription status in `localStorage` (15-min TTL)**
- `useSubscription` currently re-queries `workspace_subscriptions` every mount. Add a per-workspace cache key (`tw:sub:<workspaceId>`) hydrated synchronously as TanStack `initialData`, written on every successful fetch, invalidated on Stripe sync / `workspace_changed` / manual `refetch`.
- Cuts the network round-trip on every page nav.

**4. Suggestion chips persist until user types**
- `AgentChatView` currently dismisses chips on send and per-message via `dismissedSuggestionIds`. The miss is that chips disappear as soon as a new assistant message starts streaming.
- Change `activeComposerPrompt` to: keep showing chips from the most-recent answered prompt until either (a) the user starts typing in the composer, or (b) a fresh assistant message arrives with its own suggestions. Track `userStartedTyping` from the existing `chatInputRef` `onInput`.

**5. Error Boundaries around the 5 main app views**
- Add a small `<RouteErrorBoundary>` (uses existing `react-error-boundary` if installed, else a tiny class component) with a friendly retry card.
- Wrap the children of: `AssistantPage`, `DashboardPage`, `DnaPage` (+ detail), `WorkforcePage`, `ConnectionsPage`. One render crash no longer takes down the shell.

---

### Needs your decision before I touch it

**6. Switch context loading from 200-row dump → pgvector RAG**
- This is a real project, not a one-liner. It requires: enabling the `vector` extension, adding an `embedding vector(768)` column + IVFFLAT index to `user_business_data`, a backfill edge function to embed existing rows, an embed-on-write trigger/edge hook, and rewriting `retrieveRelevantContext` in `_shared/run-employee/rag.ts` to do a similarity query instead of `select(...).limit(200)`.
- Worth doing — the cost claim is plausible — but it's a 1–2 day change with a backfill window. **Confirm and I'll do it as its own pass.**

**7. Deno KV cache for business context**
- Supabase Edge Functions don't run on Deno Deploy, so `Deno.openKv()` isn't available in this runtime. The equivalent here is a Postgres-backed cache table or in-memory per-isolate cache (only helps warm isolates).
- Recommendation: skip Deno KV; instead add a small `context_cache` table keyed by `(workspace_id, business_id, content_hash)` with a 10-min TTL, read before `buildBusinessBrainContext`. **Want me to do that as a substitute?**

---

### You have to do this one (no code)

**8. Enable Supabase PgBouncer / connection pooler**
- Lovable Cloud → Connectors → Lovable Cloud → open backend → Project Settings → Database → Connection Pooling → enable "Transaction" mode on port 6543.
- Edge functions already use the JS client over HTTPS so no code change needed; this only helps if/when you add direct `psql`/Postgres clients. Flip it whenever; nothing in the codebase blocks on it.

---

### Files I'll touch (for items 1–5)

- `supabase/migrations/<new>_user_business_data_composite_indexes.sql` (new)
- `supabase/functions/_shared/run-employee/http-handler.ts`
- `supabase/functions/assistant-chat/index.ts` (if same preflight pattern)
- `src/hooks/useSubscription.ts`
- `src/components/database/AgentChatView.tsx`
- `src/components/error/RouteErrorBoundary.tsx` (new)
- `src/pages/AssistantPage.tsx`, `DashboardPage.tsx`, `DnaPage.tsx`, `DnaDetailPage.tsx`, `WorkforcePage.tsx`, `ConnectionsPage.tsx`

Approve and I'll ship 1–5. Tell me yes/no on 6 and 7 and I'll fold them in.