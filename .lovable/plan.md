# Move onboarding into the AI CEO chat

Replace the standalone `/onboarding` wizard with a chat-driven onboarding that runs inside the AI CEO view (`TimeWarpAIView`). Same questions, same backend calls, but presented as a conversation with inline cards for the visual steps.

## What changes for the user

- New users land on `/app?view=aiceo` instead of `/onboarding`.
- The assistant greets them and asks for the website URL in chat.
- Same scrape → product picking → image picking → forging DNA → name your agent flow, but each visual step is rendered as an inline message inside the chat thread.
- Final step "Take me to {agentName}" routes to Business DNA (same as today's onboarding completion → BusinessDNAView).
- `/onboarding` route is removed. Anything pointing there is rewritten to the AI CEO view.

## Chat onboarding sequence

```text
[assistant] Welcome — what's your website? (URL input chip)
[user]      tesla.com
[assistant] Analyzing… (inline progress bar)
[assistant] Found 6 offerings — pick the ones you sell (inline product cards, multi-select)
[user]      (selects)
[assistant] Pick the strongest image for {product} (inline image grid, one per product)
[user]      (selects)
[assistant] Forging your Business DNA (inline timeline: Confirming offerings → Forging DNA → Confirming data → Saving DNA)
[assistant] Name your agent (inline name input)
[user]      Nova
[assistant] Take me to Nova → (CTA button → navigates to Business DNA view)
```

## Files to add

- `src/components/database/aiceo/ChatOnboardingFlow.tsx` — orchestrator that owns onboarding state (URL, discoveredProducts, selectedProducts, selectedImages, businessType, agentName, brandId) and emits the chat messages. Reuses the existing logic blocks lifted from `BusinessDNAOnboarding.tsx`:
  - `waitForSession`, `isLowQualityImage`, `deduplicateImages`
  - `scrape-product` discover-mode call
  - `scrape-product` core-mode call + `save-onboarding` invocation
  - Background `enrich-pillars` trigger
- `src/components/database/aiceo/onboardingMessages/` — small inline-card components rendered as assistant message bodies:
  - `OnboardingUrlCard.tsx` — URL input with typewriter placeholder
  - `OnboardingProgressCard.tsx` — analyzing progress bar (reuses smooth-progress logic)
  - `OnboardingProductPicker.tsx` — product grid w/ multi-select + "Continue" button
  - `OnboardingImagePicker.tsx` — image grid for current product, advances per product
  - `OnboardingForgingTimeline.tsx` — todos checklist + sources carousel
  - `OnboardingAgentName.tsx` — name input + "Take me to {name}" button
- `src/components/database/aiceo/useOnboardingFlow.ts` — extracted hook for the orchestrator's state machine and side effects (scrape, persist, enrich).

## Files to modify

- `src/components/database/TimeWarpAIView.tsx`
  - Detect "onboarding mode" via prop `forceOnboarding` (or absence of brands from `useBusinessDNA`).
  - When in onboarding mode, render `ChatOnboardingFlow` as the initial assistant message stream and disable normal suggestions/free-text until onboarding completes.
  - Wrap with `BusinessDNAProvider` so the flow can read `brands`, call `reloadData`, and update `setBrands`.
- `src/pages/Database.tsx`
  - Remove the "fresh user → `/onboarding`" redirect (the `useEffect` checking `created_at < 30000`).
  - When `currentView === "aiceo"` AND no brands exist (and not loading), force `TimeWarpAIView` into onboarding mode.
  - Inside `BusinessDnaArea`, replace the "no brands → `<BusinessDNAOnboarding />`" branch with a redirect/auto-switch to `currentView = "aiceo"` so a brand-less user always sees the chat.
  - Default `currentView` for first-time users becomes `"aiceo"` instead of `"businessdna"`.
  - Remove the legacy `/app?onboarding=business-dna → /onboarding` redirect block.
  - On agent-name completion: switch view to `businessdna` and call `setActiveBrandId(newBrandId)` + `setShowBusinessDNA(true)` (matches the "Take me to {agent}" intent).
- `src/App.tsx`
  - Remove the `/onboarding` route and its `Onboarding` import.
- `src/pages/Onboarding.tsx` — delete file.
- `src/components/dashboard/LiveAnalysisView.tsx` and any other place navigating to `/onboarding` — rewrite to `/app?view=aiceo` (passing `?url=` if present so the chat onboarding can pre-fill the URL question).
- Existing `BusinessDNAOnboarding.tsx` — keep for the "Add another business" flow inside Business DNA (`showAddProduct === true` path is unchanged). Only the brand-less / first-time entrypoint is replaced.

## Reused backend (no changes)

- `scrape-product` (discover + core modes) — same payloads.
- `save-onboarding` — same payload.
- `enrich-pillars` — same background trigger.
- `BusinessDNAContext` — same `reloadData`, `setBrands`, `refreshBrand`.

## Edge cases handled

- User pastes URL via `?url=` (from landing-page funnel) → chat opens with the URL pre-filled and goes straight to "Analyzing…".
- Scrape failure → assistant message offers retry button (mirrors `handleRetry`).
- User refreshes mid-onboarding → no resume; chat restarts from URL question (matches today's behavior).
- "Add another business" still uses the visual `BusinessDNAOnboarding` wizard via Business DNA view (untouched).
- Returning user with brands lands directly on AI CEO chat in normal mode (no onboarding banner).
