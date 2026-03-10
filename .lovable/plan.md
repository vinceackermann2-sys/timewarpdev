

## Plan: Update Moodboard Search to Use Cosmos.co with Audience Aesthetic Framework

### What Changes

**File: `supabase/functions/scrape-product/index.ts`**

1. **Update the AI prompt for generating search terms** (lines ~554-577)
   - Change the prompt to use the framework: `(trust + feeling + Premium minimal e-commerce)`
   - The AI should generate terms that combine audience-specific visual/emotional descriptors with "premium minimal e-commerce"
   - Example output: `"hairdryer hold up + soothing pink background + premium minimal e-commerce"`

2. **Change search domain from `cosmos.so` to `cosmos.co`** (line 717)
   - Update `site:cosmos.so` → `site:cosmos.co`

3. **Extract actual image URLs from Cosmos.co pages instead of taking screenshots**
   - Instead of scraping screenshots (expensive, slow), scrape the Cosmos.co result pages for markdown/links and use AI to extract the best image URL from each page
   - Or: scrape with `formats: ["links"]` and find image URLs directly

4. **Remove Unsplash fallback entirely** (lines ~741-765)
   - Delete the fallback search block — no fallback, no fluff

5. **Remove empty slot padding** — only return the images that were actually found

### Technical Approach

For each of the 6 search terms:
1. Search Firecrawl with `site:cosmos.co {term}`
2. Take the first result URL
3. Scrape that Cosmos.co page with `formats: ["links", "html"]` to extract image URLs from the page content
4. Filter for actual image URLs (`.jpg`, `.png`, `.webp`, etc.) and return the first high-quality one
5. If no image found from that result, skip it (no fallback)

The search term prompt will be updated to:

```
Generate exactly 6 audience aesthetic search terms for a Cosmos.co moodboard.

Use this framework for each term:
[audience visual/product scene] + [trust feeling/emotion] + premium minimal e-commerce

Example for a hair product targeting aging adults:
"hairdryer hold up + soothing pink background + premium minimal e-commerce"

The terms should capture the audience's emotional world, lifestyle aspirations, and the product's visual context — combined with a premium minimal e-commerce aesthetic.

Brand: "{brandName}" ({brandCategory})
Product: {productDescription}
Target audience: {audienceDesc}

Return ONLY a JSON array of 6 phrases. No explanation.
```

### Files Modified
- `supabase/functions/scrape-product/index.ts` — update moodboard generation logic

