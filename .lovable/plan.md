
Goal: make Business DNA onboarding reliably appear right after a brand-new signup from the homepage popup.

What I found
- The current popup auth flow relies on `sessionStorage` (`tw_show_onboarding`) to trigger onboarding.
- In `src/pages/Database.tsx`, `showOnboarding` is only read once during initial state setup.
- In `src/components/landing/AuthDialog.tsx`, the onboarding flag is also set inside `onAuthStateChange`, which can happen after navigation starts.
- That creates a race: `/app` can render before the flag is present, and because `Database` does not re-check it, onboarding never appears.

Plan
1. Make the post-signup redirect explicit
- Update the popup auth flow so true new signups navigate to `/app` with an explicit onboarding trigger in the URL (for example `?onboarding=business-dna`).
- Keep normal logins going to plain `/app` so existing users are unaffected.

2. Make signup detection stricter
- In `AuthDialog`, only mark onboarding for real new-account creation.
- Prefer the successful signup response as the source of truth, and keep the recent `created_at` check only as a fallback for OAuth/new-session timing.

3. Make `/app` react to onboarding after mount
- In `src/pages/Database.tsx`, add an effect that watches `searchParams` and the current authenticated user.
- If the onboarding URL flag is present, call `setShowOnboarding(true)` even if the component already mounted.
- Continue supporting `sessionStorage` as a backup, but do not depend on it alone.

4. Clear the trigger after it is consumed
- Once onboarding is shown or completed, remove the storage flag and strip the onboarding query param so refreshes don’t replay it unexpectedly.

5. Keep flows consistent across auth entry points
- Review the full-page `/auth` route and reuse the same onboarding trigger logic there, so homepage popup signup and standard signup behave the same way.

Technical details
- Files to update:
  - `src/components/landing/AuthDialog.tsx`
  - `src/pages/Database.tsx`
  - likely `src/pages/Auth.tsx` for consistency
- No backend/database changes should be needed.
- Main fix is state/redirect coordination, not the onboarding UI itself.

Validation
- Test email signup from both “Activate CEO” and “Analyze” on `/`
- Confirm new users see Business DNA onboarding before the app shell
- Confirm existing users logging in do not see onboarding
- Confirm refresh/back button does not replay onboarding unexpectedly
- Check the flow on mobile too
