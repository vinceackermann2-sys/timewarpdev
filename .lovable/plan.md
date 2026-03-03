

## Issues and Fixes

### 1. Logo Recreation — Better AI Prompt
The current prompt says "Extract and recreate the logo" which produces a loose interpretation. Change to a more precise prompt that instructs the AI to faithfully reproduce the exact logo — matching letterforms, icon, colors, and proportions exactly as seen in the screenshot. Use `google/gemini-3-pro-image-preview` for higher quality.

### 2. Moodboard Not Showing
Logs show 6 images found, but they're likely generic image URLs from search results (ogImage, random .jpg links) — not aesthetic Pinterest images. The Firecrawl search API doesn't return actual Pinterest CDN images because Pinterest blocks scraping.

**Fix**: Use Firecrawl search with `scrapeOptions: { formats: ["screenshot"] }` to get screenshots of the search result pages (which will include visual content). Also try searching for image-heavy sites like Unsplash, Pexels with audience-related terms. Additionally, use AI image generation as a guaranteed fallback — generate 6 moodboard images with Gemini based on audience aesthetic description.

### 3. Illustrations — Change to Website Patterns, Symbols, and Icons
Current prompts generate "seamless brand patterns" and "decorative website patterns." Change to generate:
- **Pattern 1**: A set of brand-specific icons and symbols (small iconographic elements related to the product category and audience)
- **Pattern 2**: A website pattern/texture using those symbols arranged in a repeating layout

### 4. Image Guidelines — Per-Row Only, Remove Top Grid
Currently `EditableGuidelines` renders a big 3-column grid of `guidelineImageUrls` at the top (lines 200-208), then also shows per-row thumbnails (lines 211-216). User wants images only next to each text row, not in the big grid above.

**Fix** in `BrandExtendedSections.tsx`: Remove the top `guidelineImageUrls` grid (lines 200-208) so images only appear as thumbnails next to each guideline row.

---

## Changes

### Edge function (`supabase/functions/scrape-product/index.ts`):
1. **Logo prompt**: Use more precise wording — "Faithfully reproduce this exact logo. Match every detail: letterforms, icon, colors, proportions. Isolated on white/transparent background." Use `google/gemini-3-pro-image-preview` for better quality.
2. **Moodboard**: After Firecrawl search, if results don't yield good image URLs, fall back to AI-generating 6 moodboard reference images using Gemini with audience aesthetic terms.
3. **Illustrations**: Change prompts to generate brand symbols/icons set and a website pattern using those symbols.

### Frontend (`src/components/database/BrandExtendedSections.tsx`):
4. Remove the top 3-column grid display of guideline images (lines 200-208). Keep only the per-row thumbnail display.

