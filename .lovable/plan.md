

## Plan: Improve Data Richness and Offer Extraction During Onboarding

### Problem
1. **Reddit enrichment is conditional** — it only runs when there are "gaps" (empty fields), but the AI extraction prompt is so strict that it often leaves fields empty unnecessarily, and even when Reddit runs, it's limited to gap-filling rather than augmenting existing thin data.
2. **Offers/pricing often get stripped** — the `sanitizeProductOffers` function aggressively removes offers that lack "strong evidence" on the page. If the page shows a price like "$49.99" but the AI formats it slightly differently (e.g., "$49.99/mo"), the sanitizer drops it. Also, the prompt explicitly says "Do NOT guess prices" which is good, but combined with the strict sanitizer, legitimate pricing gets lost.
3. **Product and audience data is often thin** — the extraction prompt limits content to 10,000 chars and asks for only ONE product + ONE audience per page, and fields are often left empty.

### Changes

#### 1. Always Run Reddit Enrichment (not just on gaps)
**File:** `supabase/functions/scrape-product/index.ts` (~line 1258)

- Remove the `if (productGaps || audienceGaps)` gate — always attempt Reddit enrichment
- Change the merge logic to also **augment** fields that have fewer than 3 items (not just empty ones), so thin data gets supplemented
- Add more Reddit search queries (e.g., "complaints", "worth it", "vs") for richer coverage

#### 2. Fix Offer/Pricing Extraction
**File:** `supabase/functions/scrape-product/index.ts`

- Update `PRODUCT_AUDIENCE_PROMPT` (~line 447): Relax the offers instruction — instead of "ONLY include pricing with EXPLICIT prices", change to "Extract any visible pricing, price tiers, subscription costs, or 'starting at' prices. If a price is displayed anywhere on the page, include it as an offer."
- Update `sanitizeProductOffers` (~line 248): Add a fallback — if the AI returned offers but the sanitizer strips all of them, check the raw page text for price patterns (`$XX`, `€XX`, `/mo`, `/year`) and create a basic offer entry with just the price
- Update `sanitizeOffer` (~line 232): Make the evidence check less strict — allow offers that have just a title with a price-like pattern (e.g., "$49", "€29/mo")

#### 3. Enrich Product & Audience Data More Aggressively
**File:** `supabase/functions/scrape-product/index.ts`

- In the Reddit enrichment merge logic (~line 1320-1350): Change threshold from "only fill empty fields" to "augment fields with fewer than 3 items"
- Expand `REDDIT_FILL_PROMPT` (~line 1299): Add instruction to also extract pricing/offer intelligence from Reddit (people often mention prices in reviews), but mark these as Reddit-sourced
- Add a second Reddit search query focused on pricing: `site:reddit.com {brand} pricing cost worth it`

#### 4. Increase Content Window for Richer Extraction  
**File:** `supabase/functions/scrape-product/index.ts`

- In `PRODUCT_AUDIENCE_PROMPT`: Increase content slice from 10,000 to 12,000 chars for more data coverage
- Adjust `max_tokens` for product extraction from 8000 to 10000 to allow more detailed responses

### Technical Details

- All changes are in a single edge function file: `supabase/functions/scrape-product/index.ts`
- The function will need redeployment after changes
- No database schema changes needed
- No frontend changes needed — the data flows through existing Business DNA context

