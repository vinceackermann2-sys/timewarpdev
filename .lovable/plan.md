

## Fix: Referral & Invite Celebration + Actions Not Working

### Root Causes

**Bug 1 — Referred user never sees celebration:**
In `Auth.tsx`, `processReferral` sets `showCelebration(true)`, but the calling code in `onAuthStateChange` (line 88) immediately calls `navigateToDashboard()` after awaiting it. React state (`showCelebration`) hasn't rendered yet, so the page navigates away and the dialog never appears.

**Bug 2 — Referrer never sees celebration:**
There is no code anywhere that checks for completed referrals on the referrer's side. The memory mentions "one-time celebration check tracked in localStorage" but this was never implemented.

**Bug 3 — InviteAccept page has no celebration:**
The `/invite` page processes referral codes but has no `ActionsCelebration` dialog — just plain text.

### Fix Plan

**File: `src/pages/Auth.tsx`**
- Make `processReferral` return `true` if celebration was triggered
- In both `checkSession` and `onAuthStateChange`, skip `navigateToDashboard()` if `processReferral` returned `true` (navigation will happen when user dismisses the celebration dialog)

**File: `src/pages/InviteAccept.tsx`**
- Add `ActionsCelebration` dialog
- When referral completes successfully, show the celebration before allowing "Go to Workspace"

**File: `src/pages/Database.tsx`**
- On mount, check for uncelebrated referral completions for the referrer:
  - Query `referrals` table for rows where `referrer_id = current user`, `status = 'completed'`, and `actions_granted = true`
  - Compare against a localStorage key `celebrated_referral_ids` to find new completions
  - If found, show `ActionsCelebration` with reason `"referral"` and update localStorage
- Add `ActionsCelebration` component + state to Database page

### Technical Details

```text
Auth.tsx processReferral flow (fixed):
  processReferral(userId) → returns boolean
  ├── storedRef exists → rpc complete_referral
  │   ├── success → setCelebration(true), return true
  │   └── fail → return false
  └── no storedRef → return false

  onAuthStateChange:
    const celebrated = await processReferral(...)
    if (!celebrated) navigateToDashboard()
    // else: navigation deferred to celebration onClose

Database.tsx referrer check (new):
  useEffect on mount:
    query referrals where referrer_id=me, status=completed
    compare ids vs localStorage celebrated_referral_ids
    if new → show celebration, update localStorage
```

