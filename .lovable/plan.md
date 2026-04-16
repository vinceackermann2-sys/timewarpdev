

# Implement Post-Onboarding DNA Mutation Model

## Summary

The PDF defines how Business DNA should safely evolve after onboarding. Most of the core architecture (dual-ID, field edit, cascade delete, re-enrichment, caching, diff-based save, cross-tab sync) is **already fully implemented** in `BusinessDNAContext.tsx`. The PDF identifies concrete propagation gaps to close:

## What's Already Done
- Dual-ID architecture (_rowId + logical id)
- All 4 mutation types (field edit, entity addition, cascade delete, re-enrichment)
- Caching & sync (localStorage, diff-based save, cross-tab storage events)
- Workspace scoping on all queries
- Integrity rules: cascade delete, title↔content sync

## What Needs to Be Implemented

### 1. P0: Dashboard Invalidation on DNA Mutation

**Problem**: Dashboard caches generated insights per brand. When DNA changes (edit/add/delete), the dashboard shows stale data until manually refreshed.

**Solution**:
- In `BusinessDNAContext.tsx`: After any mutation (save, delete, add), dispatch a custom event `dna_mutated` with the affected `brandId`
- Also clear the dashboard localStorage cache for that brand (`dash_cards_<brandId>`)
- In `ManageDashboardView.tsx`: Listen for `dna_mutated` events. When received, show an "Insights may be outdated — Regenerate" banner and auto-clear cached cards for that brand

### 2. P1: Employee Link Validation on Brand Deletion

**Problem**: When a brand is deleted, employees with `linked_business_id` pointing to that brand's row become orphaned.

**Solution**:
- In `BusinessDNAContext.tsx` `deleteBrand()`: After deleting brand entities, query `ai_employees` for any employees whose `linked_business_id` matches any of the deleted row IDs, and set their `linked_business_id` to `null`
- Show a toast notification: "X employee(s) were unlinked from deleted business"

### 3. Orphan Validation Utilities

**Problem**: Products without valid `brandId` and audiences with empty `productIds` can accumulate.

**Solution**: Add a lightweight `validateIntegrity()` function to `BusinessDNAContext` that:
- Checks products for orphan `brandId` references
- Checks audiences for orphan `productIds` references  
- Returns warnings (not auto-delete — just detection for now)
- Called on data load, logs warnings to console

### 4. Save Architecture to Memory

Save the complete Post-Onboarding DNA Mutation Model to `mem://business-dna/mutation-model`.

## Files Changed

1. **`src/components/database/BusinessDNAContext.tsx`** — Add `dna_mutated` event dispatch after mutations, dashboard cache invalidation, employee unlink on brand delete, orphan validation on load
2. **`src/components/database/ManageDashboardView.tsx`** — Listen for `dna_mutated` event, show staleness banner with "Regenerate" button, auto-clear stale cache
3. **`mem://business-dna/mutation-model`** — Architecture memory

## What Will NOT Change
- Dual-ID architecture — already correct
- Cascade delete logic — already correct
- Diff-based save — already correct
- Cross-tab localStorage sync — already correct
- Re-enrichment flow — already correct
- Edge functions — no changes needed

