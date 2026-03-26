

# Fix: White Page After Onboarding — Incomplete Data Persisted

## Root Cause

The `save-onboarding` call at line 384 strips products and audiences down to only 5-6 fields:
```js
productsData: newProducts.map(p => ({
  name: p.name, category: p.category, description: p.description,
  features: p.features, benefits: p.benefits,
}))
```

But the full `newProducts` array has 20+ fields (painPoints, useCases, offers, images, etc.). After `reloadData()` loads the stripped data from the database, the detail views crash because fields like `offers` or `images` are `undefined` instead of arrays.

## Fix

**File: `src/components/database/BusinessDNAOnboarding.tsx` (~lines 380-393)**

Send the **complete** brand, product, and audience objects to `save-onboarding` instead of cherry-picked subsets:

```js
body: {
  brandData: newBrand,
  productsData: newProducts,
  audiencesData: newAudiences,
  brandName,
}
```

This ensures the database contains the full data structure. The detail views' existing `toArr()` guards handle any AI-returned non-array fields, but the core issue is that most fields are simply absent from the DB.

## Files

| File | Change |
|------|--------|
| `src/components/database/BusinessDNAOnboarding.tsx` | Send full product/audience objects to save-onboarding instead of stripped subsets |

