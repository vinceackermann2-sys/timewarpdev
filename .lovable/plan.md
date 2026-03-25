

# Plan: Multi-Product Scraping, Branding DNA Formulas, and Pinterest Fix

## Summary

Three changes: (1) upgrade the scrape-product edge function to handle company-level URLs by discovering and scraping up to 5 product pages, producing multiple products/audiences under one brand; (2) integrate the Branding DNA PDF formulas into the AI extraction prompt for richer brand fields; (3) fix the Pinterest moodboard scraper which is failing due to search result format issues.

---

## 1. Multi-Product Company URL Scraping

**Problem**: Currently the scraper only extracts one product + one audience from a single URL. When given `tesla.com` instead of `tesla.com/model-3`, it only scrapes the homepage content.

**Solution**: Add a URL detection step in `scrape-product/index.ts`:

- Detect if the URL is a "company URL" (no product-specific path, e.g. `tesla.com`, `nike.com`) vs a product URL (e.g. `tesla.com/model-3`)
- If company URL: use Firecrawl **Map** API to discover sub-URLs, then use AI to pick up to 5 product page URLs from the sitemap
- Scrape each product page individually (markdown only, parallel)
- Send all product page content to one AI extraction call that returns: `{ brand: {...}, products: [...max 5], audiences: [...max 5, one per product] }`
- If product URL (existing behavior): keep current single-product extraction

**Changes to the AI prompt**: Modify the JSON schema to support arrays (`products` instead of `product`, `audiences` instead of `audience`), capped at 5 each. One audience per product.

**Client-side changes** in `AddProductURLView.tsx`:
- Handle `extracted.products` (array) in addition to `extracted.product` (single) for backward compatibility
- Create multiple `ProductEntry` and `AudienceEntry` objects, each linked to the brand
- Still create only one `BrandEntry`

**Client-side changes** in `BusinessDNAOnboarding.tsx`:
- Same array handling for the onboarding flow's persistence step
- Update `save-onboarding` edge function to accept arrays of products/audiences

**Update `save-onboarding/index.ts`**: Accept `productsData` (array) alongside existing `productData` (single) for backward compatibility.

---

## 2. Branding DNA Formulas in Extraction Prompt

**Problem**: The current AI prompt has detailed Product and Audience DNA formulas but the Brand/Visual Identity section only has generic instructions. The uploaded PDF defines precise formulas for 9 brand fields.

**Solution**: Integrate the PDF's branding formulas into the extraction prompt in `scrape-product/index.ts`:

Add a new section to the prompt between the Audience DNA section and the JSON schema:

```
BRANDING DNA FORMULAS & EXAMPLES

1. PRIMARY LOGO
Formula: [MARK TYPE] + [WHAT IT SYMBOLISES] + [WHERE IT MUST WORK] + [WHAT BREAKS IT]

2. BRAND COLORS  
Formula: [PRIMARY EMOTION] + [COLOR ROLE] + [WHAT IT MUST NEVER DO] + [ACCESSIBILITY RULE]

3. TYPOGRAPHY
Formula: [FONT PERSONALITY] + [HIERARCHY RULES] + [WHAT IT MUST NEVER BE] + [BRAND VOICE IT EXPRESSES]

4. MOODBOARD (description only — images sourced separately)
Formula: [WORLD THE BRAND LIVES IN] + [LIGHTING & TEXTURE] + [WHAT IT FEELS LIKE] + [WHAT IT MUST NEVER FEEL LIKE]

5. ILLUSTRATIONS
Formula: [STYLE FINGERPRINT] + [WHERE THEY'RE USED] + [WHAT THEY COMMUNICATE] + [WHAT MAKES THEM OWNABLE]

6. IMAGE GUIDELINES
Formula: [WHAT TO SHOOT/USE] + [LIGHTING RULE] + [SUBJECT RULE] + [WHAT TO NEVER SHOW]

7. WEBSITE & DIGITAL
Formula: [LAYOUT PHILOSOPHY] + [CONTENT HIERARCHY] + [EMOTIONAL JOURNEY] + [WHAT ONE PAGE MUST ALWAYS DO]

8. BUTTONS & UI ELEMENTS
Formula: [HIERARCHY RULE] + [SHAPE LANGUAGE] + [COLOR SYSTEM] + [WHAT INTERACTION FEELS LIKE]

9. SOCIAL MEDIA
Formula: [CONTENT PILLARS] + [VISUAL RULES] + [TONE OF VOICE] + [WHAT SUCCESS LOOKS LIKE PER FORMAT]
```

Update the `visualIdentity` JSON schema to include new fields:
- `moodboardDescription` (string) — the textual moodboard formula output
- `illustrationGuidelines` (string) — illustration style description
- `logoDescription` (string) — logo analysis following the formula

These text descriptions guide the existing AI image generation steps and appear in the Brand detail view.

---

## 3. Fix Pinterest Moodboard Scraper

**Problem**: The Pinterest scraper searches `site:pinterest.com [term]` via Firecrawl search, then tries to extract `i.pinimg.com` URLs from the search result markdown snippets. This fails because Firecrawl search results don't reliably include raw image URLs in their markdown/description fields.

**Solution**: Change the moodboard sourcing strategy:

- Instead of `site:pinterest.com`, search for the aesthetic terms directly (without Pinterest restriction) using Firecrawl search with `scrapeOptions: { formats: ['markdown'] }` to get actual page content
- Extract image URLs from the scraped content of the search results
- Additionally, try Firecrawl scrape on Pinterest pin pages with `formats: ['screenshot']` as a fallback to capture the pin image
- As a final fallback, use AI image generation (Gemini image model) to create moodboard images matching the aesthetic terms — this guarantees 6 images even if web scraping fails entirely

**Specific code changes** in the moodboard section (~lines 642-816):
- Remove `site:pinterest.com` prefix from search queries
- Add `scrapeOptions` to search to get page markdown
- Extract `og:image` and other image URLs from results, not just `i.pinimg.com`
- Add AI generation fallback for any missing moodboard slots

---

## Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/scrape-product/index.ts` | Add Map API call for company URLs, multi-product AI prompt, branding DNA formulas, fix moodboard |
| `src/components/database/AddProductURLView.tsx` | Handle `products[]` and `audiences[]` arrays from response |
| `src/components/database/BusinessDNAOnboarding.tsx` | Handle arrays in persistence step |
| `supabase/functions/save-onboarding/index.ts` | Accept arrays of products/audiences |
| `src/components/database/BusinessDNAContext.tsx` | No schema changes needed — already supports multiple products/audiences |
| `src/components/database/AddProductURLView.tsx` | Update URL examples to include company URLs like `tesla.com`, `nike.com` |

