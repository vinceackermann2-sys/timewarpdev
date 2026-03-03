

## Problem

The moodboard search isn't working because:
1. Firecrawl search with Pinterest-related queries returns page metadata/links, but Pinterest lazy-loads images — so `pinimg.com` URLs never appear in markdown or metadata
2. The fallback AI-generated moodboard images are generic and not from Pinterest
3. The user wants real Pinterest aesthetic images, one per search term

## Solution

Replace the entire moodboard logic with a two-step approach:

### Step 1: Generate aesthetic search terms from audience/brand data
Use the extracted audience description, brand category, and colors to produce 5-6 specific aesthetic terms (e.g., "Muted botanical motifs", "Sun-drenched linen texture", "Earthy pastel palette").

### Step 2: For each term, scrape a Pinterest pin page screenshot
- Search Pinterest via Firecrawl search (`site:pinterest.com {term}`) to find individual pin URLs
- For each pin URL found, use Firecrawl scrape with `formats: ["screenshot"]` to capture the pin's image visually
- This gives us one real Pinterest-sourced image per aesthetic term
- If pin scraping fails for a term, fall back to AI-generating that specific moodboard image

### Edge function changes (`supabase/functions/scrape-product/index.ts`):

Replace the moodboard promise (lines ~507-688) with:

1. **Generate search terms** using the AI — ask Gemini to produce 6 short aesthetic phrases based on `audienceDesc`, `brandCategory`, and `brandColors`
2. **For each term**, run Firecrawl search `site:pinterest.com {term}` (limit: 3) to find pin URLs
3. **Scrape the first pin URL** with `formats: ["screenshot"]` to get a visual capture of the actual Pinterest pin
4. **Collect screenshots** as base64 data URLs into `moodboardUrls`
5. **Fallback per term**: if no pin URL found or scrape fails, generate an AI image for that term using Gemini

This approach guarantees 6 moodboard images — each tied to a specific aesthetic term, sourced from Pinterest when possible, AI-generated when not.

