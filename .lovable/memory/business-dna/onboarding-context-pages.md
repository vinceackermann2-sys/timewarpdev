---
name: Onboarding Smart Sub-URL Discovery
description: CORE-mode scrape-product uses Firecrawl /map to discover all sitemap URLs, tier-ranks them, and scrapes up to 15 high-signal pages in parallel to enrich Brand + Audience extraction
type: feature
---

In `scrape-product` CORE mode (STEP 2.5), after homepage scrape and product mapping, the function runs a smart **sub-URL discovery + deep DNA analysis** pipeline:

## Step A — URL Discovery
- **Primary**: Firecrawl `/v2/map` on the parent URL (limit 500, same domain only) — returns sitemap URLs in ~1s
- **Fallback**: Homepage HTML/markdown `href` extraction if `/map` fails or yields nothing
- 8s timeout on `/map` call via `Promise.race`

## Step B — Tier-Based Filtering & Ranking

**Tier 1 (always include if found, max 1 per category):**
| Key | Patterns |
|-----|----------|
| about | /about, /about-us, /company, /who-we-are |
| mission | /mission, /purpose, /vision |
| team | /team, /people, /leadership, /founders |
| pricing | /pricing, /plans, /membership, /subscribe |
| services | /services, /solutions, /what-we-do, /capabilities, /offerings |
| products | /products, /product-overview, /features |
| contact | /contact, /contact-us, /get-in-touch, /locations |
| faq | /faq, /faqs, /help, /frequently-asked |
| how-it-works | /how-it-works, /how-we-work, /process, /methodology |

**Tier 2 (fill remaining slots up to 15):**
case-studies, customers, testimonials, integrations, security, careers, values, story, press

**Excluded (regex):**
`/blog/*`, `/tag/*`, `/author/*`, `/category/*`, `/page/N`, `/login`, `/signup`, `/cart`, `/checkout`, `/account`, language duplicates (`/de/`, `/fr/`, `/es/`, `/it/`, `/pt/`, `/ja/`, `/zh/`, `/ko/`, `/nl/`, `/sv/`, `/no/`, `/da/`, `/fi/`, `/pl/`, `/ru/`), file extensions (`.pdf`, `.zip`, `.xml`, `.json`, images, media, css/js), and any URL with `?utm_*`.

Two-pass selection: tier-1 first, then tier-2 to fill. Hard cap **15 URLs**.

## Step C — Parallel Scraping
- **3 parallel batches of 5** via Firecrawl `/v1/scrape` (`onlyMainContent: true`, `waitFor: 1000`)
- Per-page fallback to `fetchPageFallback` on Firecrawl failure
- **30s overall deadline** via `Promise.race` — partial results accepted
- Each page capped at **2000 chars** (down from 2500 to fit more pages)
- Failed pages silently skipped — never blocks onboarding

## Step D — Deep DNA Extraction
Combined markdown injected into BOTH AI prompts:

1. **`BRAND_PROMPT`** — receives full enriched markdown (homepage + all context pages) at 20000 char budget
2. **`PRODUCT_AUDIENCE_PROMPT`** — NEW: receives a compact `audienceEnrichment` slice (8000 chars) with only audience-relevant sections (about, mission, team, case-studies, customers, testimonials, values, story). Used for audience inference only — explicit prompt rule prevents hallucinating product features from this context.

Per-key markdown stored in `contextPagesByKey` dict for selective slicing.

## Safety Guarantees
- All discovered URLs appended to `scannedUrls` so onboarding UI shows what was used
- Failure of `/map`, all scrapes, or 30s timeout → graceful fallback to homepage-only behavior
- Token budget capped at 30000 chars total enrichment (within Gemini 3 Flash limits)
- No new dependencies — uses existing Firecrawl connector

## Trade-offs
- +5-10s onboarding time (parallelized, capped at 30s)
- +10-20 Firecrawl credits per business
- **Result**: Much richer DNA — full mission, team bios, case studies, integrations, security posture, values flowing into Brand + Audience extraction
