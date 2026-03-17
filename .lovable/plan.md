

## Plan

### 1. Replace "Pricing" with "AI-CEO" in footers and header
- **`src/components/database/MyBusinessesView.tsx`** (line 383): Change `Pricing` link to `AI-CEO` linking to `/`
- **`src/components/landing/Header.tsx`** (lines 30-32, 72-78): Change `Pricing` links to `AI-CEO` linking to `/`
- **`src/components/landing/CTA.tsx`** (line 42): Change `View Pricing` to `AI-CEO` linking to `/`
- **`src/components/landing/Footer.tsx`**: Already has AI-CEO, no change needed

### 2. Upgrade UpgradeGateDialog — bigger, benefits list, remove "billed annually" text
- **`src/components/database/UpgradeGateDialog.tsx`**: 
  - Increase `max-w-md` to `max-w-lg`
  - Remove "Billed annually · Locked in forever" text
  - Add a benefits comparison list (e.g. "Unlimited Actions", "AI Employees", "Data Conversion", "Priority Support", "Dev Line Access") with checkmarks, compared to "At Launch" pricing context
  - Keep $999/mo price and 23 spots badge

### 3. Fix gating — only free users see the popup
The current `useFreePlanGate.ts` logic already checks `!isLoading && !hasActivePlan && !plan`. The issue is likely that `plan` from `useSubscription` returns a string like `"co_founder"` but the subscription check may be failing silently. Let me verify by checking `check-subscription` edge function behavior. However, the safer fix is to also guard at the **call site** in `DatabaseSidebar.tsx` — the `isFreeUser` value from the hook should already be `false` for paid users. I'll add a double-check: if `isLoading` is true, don't call `openGate()` either.

- **`src/components/database/DatabaseSidebar.tsx`**: Add explicit guard — only call `openGate()` when `isFreeUser` is definitively `true`
- **`src/hooks/useFreePlanGate.ts`**: Already correct, but will add extra logging safety

### 4. What's New — dot instead of number, move "Introducing" to Updates tab
- **`src/components/database/WhatsNewDropdown.tsx`**:
  - Move the TimeWarp Beta item from `inboxItems` to `updateItems`
  - Change the notification badge from a number to a small round dot (remove text, make it `h-2 w-2`)
  - Change sidebar trigger badge from number to dot as well

### Files to change
| File | Change |
|------|--------|
| `src/components/database/UpgradeGateDialog.tsx` | Bigger dialog, benefits list, remove billed text |
| `src/hooks/useFreePlanGate.ts` | Reinforce gating safety |
| `src/components/database/DatabaseSidebar.tsx` | Extra guard on openGate calls |
| `src/components/database/WhatsNewDropdown.tsx` | Dot badge, move item to Updates |
| `src/components/database/MyBusinessesView.tsx` | Pricing → AI-CEO |
| `src/components/landing/Header.tsx` | Pricing → AI-CEO |
| `src/components/landing/CTA.tsx` | View Pricing → AI-CEO |

