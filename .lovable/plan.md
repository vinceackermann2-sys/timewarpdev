

## Fix: Referral & Invite Actions Not Granted + No Celebration

### Problems Identified

1. **Auth.tsx race condition**: After `processReferral` sets `showCelebration(true)`, the calling code immediately calls `navigateToDashboard()` on the next line (lines 76-78, 85-88), navigating away before the celebration dialog renders.

2. **InviteAccept.tsx**: No celebration dialog at all — just a static success message. Users who join via invite link with a referral code never see the celebration.

3. **Referrer never notified**: There's no mechanism to show the referrer their +125 Actions bonus when someone completes their referral.

### Fix Plan

#### 1. Auth.tsx — Stop navigating after successful referral

**Change `processReferral`** to return a boolean. When it returns `true` (referral completed), skip `navigateToDashboard()` — the celebration dialog's `onOpenChange` already handles navigation on dismiss.

```
Lines 55-70: processReferral returns true on success
Lines 72-78: checkSession — if processReferral returned true, don't navigate
Lines 83-90: onAuthStateChange — same guard
```

#### 2. InviteAccept.tsx — Add ActionsCelebration dialog

- Import and render `ActionsCelebration`
- After `complete_referral` RPC succeeds, show the celebration before navigating
- After workspace invite succeeds (no referral), navigate directly

#### 3. Database.tsx — Check for unseen referral completions (referrer side)

- On mount, query `referrals` table for rows where `referrer_id = auth.uid()` AND `status = 'completed'` AND `completed_at` is recent (or use a localStorage timestamp to track last-seen)
- If found, show `ActionsCelebration` with reason `"referral"`
- Store `lastSeenReferralAt` in localStorage to avoid repeat celebrations

### Files Changed

- `src/pages/Auth.tsx` — Fix race condition in processReferral flow
- `src/pages/InviteAccept.tsx` — Add celebration dialog for referred users
- `src/pages/Database.tsx` — Add referrer-side celebration check on mount

