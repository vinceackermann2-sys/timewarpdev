

## Plan: Reddit-Backed Data Enrichment for Missing Product/Audience Fields

### Overview
After the initial AI extraction of products and audiences from the scraped website, check for empty/missing fields. If gaps exist, search Reddit via Firecrawl for real user discussions about the brand/product, then use AI to fill only the missing fields with Reddit-sourced data. Show Reddit as a verified source in the onboarding UI.

### Technical Details

#### 1. Add Reddit enrichment step in `supabase/functions/scrape-product/index.ts`

After the parallel brand + product/audience extraction (around line 1126), add a new phase:

- **Detect gaps**: For each product, check if key fields are empty (features, benefits, painPoints, useCases, targetScenarios, uniqueSellingPoints, competitiveAdvantages, commonObjections, proofPoints, dosAndDonts, powerPhrases, powerWords). For each audience, check similar fields (buyingTriggers, useCaseRequirements, engagementTriggers, attentionHooks, commonObjections, valuePropositions, etc.)
- **Skip**: `offers` on products (as requested) and fields that already have data
- **Search Reddit via Firecrawl**: Use the Firecrawl search API (`https://api.firecrawl.dev/v1/search`) with query like `"site:reddit.com {brandName} {productName} review"` and `scrapeOptions: { formats: ["markdown"] }` to get actual Reddit discussion content
- **AI fill with Reddit context**: Pass the Reddit markdown content + the list of missing fields to a focused AI prompt that extracts ONLY data backed by the Reddit discussions. The prompt will be strict: "Only fill fields where you find explicit evidence in the Reddit content. Do not fabricate."
- **Track Reddit usage**: Return a `redditEnriched: true` flag and `redditUrls: string[]` in the response alongside the extracted data

#### 2. New AI prompt: `REDDIT_FILL_PROMPT`

A focused prompt that receives:
- The product/audience name and existing data
- Reddit discussion content (markdown)
- List of empty field names to fill

Returns only the fields that have Reddit-backed evidence, with empty values for anything not found.

#### 3. Update response shape

Add to the core mode response:
- `redditEnriched: boolean` — whether Reddit was used
- `redditUrls: string[]` — actual Reddit URLs used as sources

#### 4. Update frontend: `BusinessDNAOnboarding.tsx`

- Read `redditEnriched` and `redditUrls` from the scrape response
- Add Reddit URLs to `scannedUrlsRef.current` so they appear in the source verification carousel
- Show a Reddit icon/badge next to sources that are from Reddit (detect by URL containing `reddit.com`)

### Files to Modify
- `supabase/functions/scrape-product/index.ts` — add Reddit search + AI fill logic after extraction
- `src/components/database/BusinessDNAOnboarding.tsx` — display Reddit sources in the verification carousel

### Flow
```text
1. Scrape website → extract brand/products/audiences (existing)
2. Check for empty fields on products (except offers) and audiences
3. If gaps found → Firecrawl search "site:reddit.com {brand} {product} review"
4. Pass Reddit content to AI with strict "evidence-only" prompt
5. Merge Reddit-backed data into empty fields only
6. Return redditEnriched flag + redditUrls
7. Frontend shows Reddit URLs in source carousel with Reddit branding
```

