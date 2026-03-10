## Plan: Switch Moodboard Source from Cosmos.co to Pinterest

### Problem

Cosmos.co uses heavy JS rendering, so Firecrawl can't extract image URLs from the scraped markdown. Pinterest is a better source because:

- Pinterest CDN images (`i.pinimg.com`) follow predictable URL patterns
- Firecrawl search results for `site:pinterest.com` return pin URLs
- Pinterest pin pages contain `i.pinimg.com` image URLs in the markdown/HTML that are extractable

### Approach

Use Firecrawl **search** (not scrape) with `site:pinterest.com` queries. Firecrawl search already returns markdown snippets per result — we can extract `i.pinimg.com` URLs directly from those snippets without needing a second scrape call. This is faster and more reliable.

### Changes

**File**: `supabase/functions/scrape-product/index.ts` (lines ~542-710)

1. **Update AI prompt** — Change "Cosmos.co moodboard" to "Pinterest moodboard" in the search term generation prompt. Use the same framework to produce Pinterest-friendly search queries as before.
2. **Replace Cosmos.co search+scrape with Pinterest search** — For each term:
  - Firecrawl search: `site:pinterest.com ${term}`, limit 5
  - Extract `i.pinimg.com` URLs from the search result markdown snippets using regex
  - Filter for high-res pins (URLs containing `/originals/` or `/736x/` or `/564x/`, skip `/75x/` thumbnails)
  - Take the first qualifying image per term
3. **Fallback**: If no `i.pinimg.com` URL found in search markdown, scrape the first Pinterest pin URL with `formats: ["markdown"]` and extract from there. No screenshot fallback needed.
4. **Update log messages** — Replace "Cosmos.co" references with "Pinterest".

This eliminates the double network call (search → scrape) in most cases, making it faster and more reliable. Pinterest's CDN URLs are consistently present in Firecrawl search result snippets.