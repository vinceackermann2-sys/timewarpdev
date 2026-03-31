

## Plan: Three Quick Fixes

### 1. "Take Me To Agent" button style — match other onboarding buttons
The current "Take Me To {agent}" button uses `bg-[#f4f3ee]` (cream/beige), while all other action buttons in the flow use `bg-[#3399ff]` (blue) with white text. Change line 1485 to match.

**File:** `src/components/database/BusinessDNAOnboarding.tsx`
- Change the button className from `bg-[#f4f3ee] border border-[#e5e4df] text-[#1a1f36] hover:bg-[#e5e4df]` to `bg-[#3399ff] hover:bg-[#287acc] text-white`
- Keep the rounded-2xl, font-bold, text-lg, flex layout, gap, transition, active:scale

### 2. Post-signup redirect — go straight to onboarding instead of requiring re-login
Currently `emailRedirectTo` in Auth.tsx (line 217) points to `window.location.origin + "/"` which lands on the homepage, requiring the user to log in again. Also in AuthDialog.tsx (line 172) it points to `/app?onboarding=business-dna`.

**Changes:**
- **`src/pages/Auth.tsx` line 217**: Change `emailRedirectTo` to `${window.location.origin}/app?onboarding=business-dna` so after email confirmation, users land directly in the onboarding flow with an active session.
- **`src/pages/Auth.tsx` lines 104-109**: In `handleAuthenticatedUser`, when the user is brand-new (`isNewUser` check), always navigate to `/app?onboarding=business-dna` so they go straight to onboarding rather than being asked to log in again. Also store a `pendingProductUrl` in localStorage before signup so if the user entered a URL on the hero, it persists across the email confirmation redirect.
- Store `productUrl` from `searchParams.get("url")` in localStorage on signup so it survives the email redirect, then read it back and pass it as `url` param on the redirect.

### 3. Hero text change
**Files:** `src/components/aiceo/HeroSection.tsx` (line 170-173)
- Change `Levers pulled by AI CEO` → `Levers pulled for-you`

### Technical Details
- All three changes are simple text/className replacements
- No backend or database changes needed
- The redirect fix ensures the Supabase auth callback lands on `/app?onboarding=business-dna` which the Database page already handles to show the onboarding flow

### Files Changed
1. `src/components/database/BusinessDNAOnboarding.tsx` — button style (1 line)
2. `src/pages/Auth.tsx` — emailRedirectTo + localStorage for productUrl
3. `src/components/aiceo/HeroSection.tsx` — hero subtitle text

