

## Problem

Two issues prevent the `scrape-product` edge function from working:

### 1. SyntaxError — Function cannot boot
The logs show: `Uncaught SyntaxError: Identifier 'results' has already been declared at line 904:17`

Looking at the code, inside the guideline image generation block (lines 769-828), there are **two `const results` declarations in the same scope**:
- Line 774: `const results: string[] = [];` (unused leftover)
- Line 820: `const results = guidelineResults.filter(...)...`

This is a compile-time SyntaxError that prevents the entire function from loading. Every request — including OPTIONS preflight — gets a boot failure, which is why the user sees CORS errors (the OPTIONS handler never runs).

### 2. Missing config.toml entry
`scrape-product` is not listed in `supabase/config.toml` with `verify_jwt = false`. This means JWT verification is enabled by default, which would block unauthenticated calls even after the syntax fix.

## Solution

### Fix 1: Remove duplicate variable declaration
In `supabase/functions/scrape-product/index.ts`, delete line 774 (`const results: string[] = [];`) — it's an unused leftover from the pre-parallelization code. The actual `results` on line 820 is the one that matters.

### Fix 2: Add config.toml entry
Add `[functions.scrape-product]` with `verify_jwt = false` to `supabase/config.toml`.

### Fix 3: Redeploy
Deploy the function to verify it boots cleanly.

## Changes

**File: `supabase/functions/scrape-product/index.ts`**
- Remove line 774: `const results: string[] = [];`

**File: `supabase/config.toml`**
- Add `[functions.scrape-product]` / `verify_jwt = false`

