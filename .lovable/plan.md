

# Fix: Duplicate Businesses Created During Onboarding

## Root Cause

Double insertion — the `save-onboarding` edge function inserts brand/products/audiences into the DB, then `BusinessDNAOnboarding` appends them to context state via `setBrands(prev => [...prev, newBrand])`. The context's sync effects (brands/products/audiences `useEffect`) detect these as new items (no `_rowId`) and insert them into the DB **again**, creating duplicates. When loading duplicates with the same logical ID, detail views break (white page).

## Fix

**In `BusinessDNAOnboarding.tsx` (lines 412-416):** Instead of manually appending to context state, force a reload from the database. This ensures loaded items have `_rowId` set, so the sync effects won't re-insert them.

1. Add a `reloadData` function to `BusinessDNAContext` that resets `loadedWorkspaceRef` and re-fetches from DB
2. In `BusinessDNAOnboarding`, after `save-onboarding` succeeds and `localStorage` is updated with `preferred_workspace_id`, call `reloadData()` instead of `setBrands/setProducts/setAudiences`

### Changes

**File: `src/components/database/BusinessDNAContext.tsx`**
- Add a `reloadData` method to the context that clears `loadedWorkspaceRef.current` and triggers a fresh load from the database
- Expose it in the context type and provider value

**File: `src/components/database/BusinessDNAOnboarding.tsx`**
- Replace lines 412-416 (manual `setBrands`/`setProducts`/`setAudiences` appends) with a single call to `reloadData()` from the context
- This ensures all items come back with `_rowId`, preventing the sync effects from creating duplicates

**File: `supabase/functions/save-onboarding/index.ts`**
- Remove duplicate workspace rename block (lines 151-153 are an exact copy of 147-149)

