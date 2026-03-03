

## Problem Analysis

The edge function `scrape-product` is timing out and the connection closes before it completes. The logs show:
- "Http: connection closed before message completed" — the function exceeds Deno's execution time limit
- "Final moodboard count: 0" — all 6 Pinterest scrapes fail (Pinterest blocks/times out Firecrawl scrapes)
- The function runs too many **sequential** operations: 6 sequential moodboard searches, 6 sequential BG removals, 4 sequential guideline images

The root causes:
1. **Sequential loops** — moodboard, BG removal, and guideline generation all run one-at-a-time inside `for` loops, but they're independent and should be parallelized
2. **Pinterest scraping unreliable** — Firecrawl scrape of Pinterest pin pages consistently times out, yielding 0 moodboard images
3. **Too many AI calls total** — logo + 2 illustrations + 4 guidelines + 6 BG removals = up to 13 sequential AI image calls on top of the moodboard

## Solution

### 1. Parallelize all independent operations within each pipeline

Replace sequential `for` loops with `Promise.all` / `Promise.allSettled` for:
- **Moodboard**: Run all 6 Pinterest search+scrape attempts in parallel instead of sequentially
- **Product BG removal**: Run all 6 background removal AI calls in parallel
- **Guideline images**: Run all guideline image generations in parallel

### 2. Fix moodboard reliability

The Pinterest pin screenshot approach consistently fails. Change to:
- Use Firecrawl search with `scrapeOptions: { formats: ["screenshot"] }` parameter (captures a screenshot of each search result page inline)
- If that doesn't yield images, search for the terms on image-heavy sites (Unsplash, Pexels) instead of Pinterest specifically
- As a last resort for any term that still fails, use a simpler Firecrawl scrape of the Pinterest search results page itself (not individual pins)

### 3. Reduce total work

- Limit BG removal to max 4 images (not 6) to reduce AI calls
- Limit guideline images to max 3

## Changes

**File: `supabase/functions/scrape-product/index.ts`**

1. **Moodboard loop** (lines 561-666): Replace the sequential `for` loop with `Promise.allSettled` — run all 6 term searches in parallel. Also add `scrapeOptions` to the Firecrawl search call so results include screenshots inline, avoiding the separate scrape step.

2. **Product BG removal loop** (lines 875-909): Replace sequential `for` with `Promise.all` on all images simultaneously. Reduce cap from 6 to 4.

3. **Guideline image loop** (lines 817-858): Replace sequential `for` with `Promise.all`.

4. Redeploy the function.

