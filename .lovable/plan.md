

## Plan: Enhanced Forging DNA Step with Real Data, Sources & Social Proof

### Summary
Upgrade the "Forging DNA" step (steps 4-5) to show real extracted data instead of placeholder labels, track completion of each to-do item progressively, display scanned URLs as sources, and add social proof quotes from scraped content. Also pass `scannedUrls` from the scrape result into the forging UI.

### Changes

**File: `src/components/database/BusinessDNAOnboarding.tsx`**

1. **New state**: `forgingTodos` — array of `{ label, status: 'pending'|'done', completedAt?: Date }` tracking each step (Analyze business, Extract brand, Extract products, Extract audiences, Save to database, Enrich brand). Each transitions to `done` at the right moment during the persistence effect.

2. **Store `scannedUrls`** from the scrape result (`scrapeResult.current` already includes it from the edge function response — need to store `data.scannedUrls` alongside `data.extracted`). Add `scannedUrls` ref.

3. **Extract social proof quotes** during scrape: parse the homepage markdown for Reddit-style quotes, testimonials, or review snippets. Use a simple regex/heuristic to find quoted text or testimonial patterns (e.g., text in quotes, text near "— Username" patterns). Store as `socialProof: { quote, source }[]`.

4. **Step 4 persistence effect updates**: Mark each todo as `done` progressively:
   - "Analyze business" → done when scrape completes (already done by step 4)
   - "Extract brand identity" → done after brand data is prepared
   - "Extract products" → done after products are mapped
   - "Extract audiences" → done after audiences are mapped
   - "Save to database" → done after `save-onboarding` returns
   - "Enrich brand" → done after `enrich-brand` returns

5. **"Data Found" tab** shows:
   - Brand card with name, category, colors preview
   - Products list with names and image counts
   - Audiences list with names and descriptions
   - Each with a checkmark when confirmed

6. **"Confirmed Data" tab** shows the same items but only after persistence completes, with green checkmarks and summary counts.

7. **Sources section** below tabs:
   - Collapsible list of `scannedUrls` with domain favicons
   - Shows "X sources analyzed" count

8. **Social proof section** below sources:
   - Cards with quote text, attributed source (e.g., "Reddit User", "Customer Review")
   - Styled as blockquotes with the cream/blue aesthetic
   - Only shown if quotes were found during scrape

### Scrape Response Integration
The scrape-product function already returns `scannedUrls` in the response. Currently only `data.extracted` is stored. We need to also capture `data.scannedUrls` and `data.isMultiProduct` from the scrape response.

### Visual Design
- Todo items: each row with spinner → green check animation on completion
- Data Found cards: `bg-[#f4f3ee]` with brand colors as small swatches, product thumbnails
- Sources: compact list with `Globe` icon per URL, `text-[13px]`
- Quotes: `border-l-4 border-[#3399ff] pl-4` blockquote style, `text-[#697386]` attribution

### Files Changed
1. `src/components/database/BusinessDNAOnboarding.tsx` — all UI + state changes in the forging steps

