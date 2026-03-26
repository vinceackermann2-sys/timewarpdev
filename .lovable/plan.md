

# Plan: Email Verification Polling Dialog + Conditional URL Step in Onboarding

## Summary

After a new user signs up via email/password from the homepage (Activate CEO / Analyze buttons), instead of just a toast, show a persistent "Checking email verification" dialog that polls until the user verifies. Once verified, navigate to `/app` with onboarding. The onboarding URL step (step 0) should only appear if the user did NOT already paste a URL on the homepage.

## Changes

### 1. Add Email Verification Polling Dialog

**File: `src/components/landing/AuthDialog.tsx`**

- Add new state: `showVerificationPolling` + `verificationEmail`
- After successful signup with no session (line 129-132), instead of closing the dialog and showing a toast, switch to a "verification polling" UI inside the same dialog
- The polling UI shows: an animated mail icon, "Check your email" heading, the email address, a subtle spinner, and a "Resend email" button
- Poll `supabase.auth.getSession()` every 3 seconds; when a session appears, it means the user clicked the verification link in another tab — the `onAuthStateChange` listener will fire and navigate to dashboard
- Also listen for `onAuthStateChange` `SIGNED_IN` event which fires when verification completes
- Store `productUrl` in sessionStorage so it survives the verification redirect flow
- When verified, navigate with `onboarding=business-dna` and conditionally include `url` param

### 2. Pass `productUrl` Through to Onboarding

**File: `src/components/landing/AuthDialog.tsx`**

- In `navigateToDashboard`, if `productUrl` exists for a new user, include it as a `url` query param alongside `onboarding=business-dna`
- This is already partially done (lines 44-46) but only for `addProduct` — ensure new users also get the URL passed through

### 3. Skip URL Step in Onboarding When URL Already Provided

**File: `src/pages/Database.tsx`**

- Already captures `productUrl` from search params (line 68, 74-76) and passes as `onboardingUrl`
- No change needed here — already works

**File: `src/components/database/BusinessDNAOnboarding.tsx`**

- Already starts at step 1 when `initialUrl` is provided (line 79: `useState(initialUrl ? 1 : 0)`)
- No change needed — already works

## Technical Details

| File | Change |
|------|--------|
| `src/components/landing/AuthDialog.tsx` | Add verification polling UI state, poll loop, resend button, conditional rendering inside DialogContent |

The verification polling approach:
- Use `setInterval` every 3s calling `supabase.auth.getSession()`
- The `onAuthStateChange` listener (already in place) will catch the `SIGNED_IN` event when the user verifies in another tab and auto-navigate
- Add a "Resend verification email" button using `supabase.auth.resend({ type: 'signup', email })`
- Show elapsed time or a pulsing animation to indicate active checking

