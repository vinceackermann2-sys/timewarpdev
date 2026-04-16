---
name: Onboarding Context Sub-URL Scraping
description: CORE-mode scrape-product enriches Brand/DNA by also scraping about/mission/team/pricing/services/contact/faq sub-pages
type: feature
---

In `scrape-product` CORE mode, after the homepage is scraped and product pages are mapped, the function additionally identifies up to 6 **context sub-URLs** from homepage links using path-pattern matching:

| Category | Path patterns |
|----------|---------------|
| about    | /about, /about-us, /company, /who-we-are, /our-story, /story |
| mission  | /mission, /values, /purpose, /manifesto, /vision |
| team     | /team, /people, /leadership, /founders |
| pricing  | /pricing, /plans, /membership, /subscribe |
| services | /services, /solutions, /what-we-do, /capabilities, /offerings |
| contact  | /contact, /contact-us, /get-in-touch, /locations |
| faq      | /faq, /faqs, /help, /frequently-asked |
| press    | /press, /media-kit, /newsroom |

Rules:
- Max 1 URL per category, max 6 total
- Same-domain only, dedupe against product URLs
- Scraped in parallel via Firecrawl (`onlyMainContent: true`, fallback to `fetchPageFallback`)
- Each section capped at 2500 chars; combined markdown injected into `BRAND_PROMPT` as `enrichedBrandMarkdown`
- BRAND_PROMPT slice budget raised from 8000 → 20000 chars
- Selected URLs appended to `scannedUrls` so onboarding UI shows what was used
- Failure is non-fatal — homepage-only extraction still works

Result: richer Brand identity (mission, voice, values), better Audience inference (from team/about pages), and more accurate DNA pillars (Strategy, People, Operations) without slowing product discovery.
