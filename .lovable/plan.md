

## Plan: Fix onboarding — redeploy edge function + auth race condition

### Problem chain

1. **`scrape-product` is not responding** — the CORS error ("No 'Access-Control-Allow-Origin' header is present") means the function crashes before returning anything. No edge function logs exist, confirming the function either isn't deployed or fails at boot. The CORS headers in the code are correct — the function just never executes.

2. **403 on `user_business_data` inserts** — after scrape fails, onboarding proceeds to persistence (it shouldn't, but does). The RLS INSERT policy requires `auth.uid() = user_id`. For brand-new signups, `auth.uid()` can be null/stale during the first few seconds. The `waitForSession` + `refreshSession` retry logic is present but may not be working because the `supabase` client's internal token is out of sync.

3. **Progress bar stalls** — the `requestAnimationFrame` loop uses refs correctly now, but the `setProgress` callback still uses a stale `prev` value for the crawl phase. When `prev` is 0 (initial) and phase B triggers, the crawl from 0 is imperceptible.

### Changes

#### 1. Redeploy `scrape-product` edge function
- Use the deploy tool to redeploy `scrape-product`
- Test it with the invoke tool immediately after
- If it fails, check logs for boot errors and fix

#### 2. Fix the auth insert path (file: `BusinessDNAOnboarding.tsx`)
- In step 2's persistence block, instead of relying on `supabase.auth.refreshSession()` inside `insertWithRetry`, call `supabase.auth.setSession()` with the access/refresh tokens obtained from `waitForSession` to force the client to use the correct JWT
- Alternative simpler fix: use `supabase.auth.getUser()` as the definitive check — if it returns a user, the token is valid; if not, the session truly isn't ready

#### 3. Stop step 2 from running if scrape failed
- The current guard `if (step === 1 && scrapeComplete && !scrapeError)` correctly blocks step transition on error
- But the scrape error from CORS throws a `FunctionsFetchError` which may not be caught properly — ensure the catch block in step 1 sets `scrapeError = true` for network-level failures too (it does, but verify the error UI shows)

#### 4. Fix progress bar continuity
- In the `setProgress` callback, track a separate `phaseB_startProgress` ref that captures `progress` when scrape completes, so the crawl starts from the actual current value (e.g. 72%) rather than relying on `prev` which can be stale in the RAF loop
- This ensures smooth transition from phase A to phase B without jumping or stalling

### Files to edit
- `supabase/functions/scrape-product/index.ts` — redeploy (no code changes needed, CORS is correct)
- `src/components/database/BusinessDNAOnboarding.tsx` — auth fix + progress fix

### Expected result
- Edge function responds correctly, scrape succeeds
- Brand/product/audience inserts succeed for new users
- Progress bar moves smoothly from 0→100%
- Errors show retry UI instead of silently failing

