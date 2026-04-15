---
name: Onboarding Intelligence Model
description: Business type classification engine and dynamic UI labels for universal onboarding
type: feature
---

## Business Type Classification Engine

The `scrape-product` edge function (discover mode) classifies businesses into one of 11 types using a lightweight AI call (`gemini-2.5-flash-lite`) after homepage scraping:

- `ecommerce`, `saas`, `agency`, `media`, `marketplace`, `consulting`, `nonprofit`, `local`, `enterprise_b2b`, `creator`, `general`

Detection signals: product grids → ecommerce, pricing tiers → SaaS, portfolio → agency, donate buttons → nonprofit, etc. Also checks platform markers (Shopify, Substack) and meta tags.

## Dynamic UI Labels

`BUSINESS_TYPE_CONFIG` in `BusinessDNAOnboarding.tsx` maps each type to:
- `label`: Card badge text (e.g., "PLAN" for SaaS, "SERVICE" for agency)
- `plural`: For headings/subtitles (e.g., "plans", "services")
- `icon`: LucideIcon per type (CreditCard, Briefcase, MapPin, Heart, Building2, etc.)
- `imageHeadline`: Step 3 headline (e.g., "Pick the best UI screenshot" for SaaS)

All previously hardcoded "product/products/PRODUCT" strings now use these dynamic values.

## Brand Metadata

`businessType` is stored on the `BrandEntry` object and persisted to `user_business_data` metadata, available for downstream context (AI prompts, dashboard, etc.).

## DEFAULT_AUDIENCE

Replaced ecommerce-biased skincare defaults with neutral empty placeholders that work for any business type. AI extraction fills real data during onboarding.

## Extraction Prompts

- `BRAND_PROMPT`: Now includes `businessType` field in output schema
- `PRODUCT_AUDIENCE_PROMPT`: Adapted field meanings per business type (offers = pricing tiers for SaaS, service packages for agencies, etc.)
- Page picker prompt: Broadened to recognize pricing pages, portfolio pages, program pages, solution pages
