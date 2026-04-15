

# Implement Onboarding Intelligence Model from PDF

## Summary

The PDF identifies a core architectural gap: the onboarding system is ecommerce-biased. The fix is adding a **Business Type Classification Engine** to the `scrape-product` discover mode, then flowing the detected type through the UI to dynamically adapt labels, icons, and prompts. The entity schemas and extraction pipeline are already comprehensive — the main changes are classification + dynamic UI labels.

## Technical Details

### 1. Add Business Type Classification to `scrape-product/index.ts` (Discover Mode)

In the discover mode section (~line 1008), after scraping the homepage, add a lightweight AI classification step before returning results:

- Call the AI with homepage content to classify into one of: `ecommerce`, `saas`, `agency`, `media`, `marketplace`, `consulting`, `nonprofit`, `local`, `enterprise_b2b`, `creator`, `general`
- Use the detection signals from PDF §1.2 (product grids → ecommerce, pricing tiers → SaaS, portfolio → agency, etc.)
- Also check platform markers (Shopify → ecommerce, Substack → media) and meta tags (Schema.org Product, og:type)
- Return `businessType` in the discover response alongside `discoveredProducts` and `quickBrand`
- Store `businessType` in `quickBrand` so it flows downstream

### 2. Update `scrape-product/index.ts` — Broaden the product page picker prompt

The AI prompt that selects product pages (~line 839) currently says "SPECIFIC, INDIVIDUAL product or service page". Update to also recognize:
- Pricing/plan pages for SaaS
- Service/portfolio pages for agencies
- Program/initiative pages for nonprofits
- Solution pages for enterprise B2B

### 3. Update `scrape-product/index.ts` — Broaden core mode extraction prompts

- `PRODUCT_AUDIENCE_PROMPT` (~line 486): Add guidance to adapt field meanings per business type (e.g., "offers" = pricing tiers for SaaS, service packages for agencies)
- `BRAND_PROMPT` (~line 450): Add `businessType` field to the output schema

### 4. Update `BusinessDNAOnboarding.tsx` — Dynamic UI labels

Add a `businessType` state that's set from the discover response. Create a config map:

```text
BUSINESS_TYPE_CONFIG = {
  ecommerce:     { label: "PRODUCT",  plural: "products",  icon: ShoppingBag, imageHeadline: "Pick the strongest product shot" },
  saas:          { label: "PLAN",     plural: "plans",     icon: CreditCard,  imageHeadline: "Pick the best UI screenshot" },
  agency:        { label: "SERVICE",  plural: "services",  icon: Briefcase,   imageHeadline: "Pick the best portfolio piece" },
  local:         { label: "SERVICE",  plural: "services",  icon: MapPin,      imageHeadline: "Pick the best photo of your business" },
  nonprofit:     { label: "PROGRAM",  plural: "programs",  icon: Heart,       imageHeadline: "Pick the best representative image" },
  creator:       { label: "OFFERING", plural: "offerings", icon: Sparkles,    imageHeadline: "Pick the best representative image" },
  enterprise_b2b:{ label: "SOLUTION", plural: "solutions", icon: Building2,   imageHeadline: "Pick the best visual" },
  general:       { label: "PRODUCT",  plural: "products",  icon: ShoppingBag, imageHeadline: "Pick the strongest image" },
}
```

Replace all hardcoded strings:
- Step 2 header: "Add products to business DNA" → `Add ${config.plural} to business DNA`
- Step 2 card label: "PRODUCT" → `config.label`
- Step 2 subtitle: "Select up to 3 products to import" → `Select up to 3 ${config.plural} to import`
- Step 3 headline: "Pick the strongest product shot" → `config.imageHeadline`
- No-products fallback: "No products found" → `No ${config.plural} found`
- Forging todo: "Confirming products" → `Confirming ${config.plural}`
- Product card icon: `ShoppingBag` → `config.icon`

### 5. Update URL_EXAMPLES in `BusinessDNAOnboarding.tsx`

Add non-ecommerce examples per PDF §6: `stripe.com`, `mckinsey.com`, `charity:water.org` alongside existing ones.

### 6. Fix DEFAULT_AUDIENCE ecommerce bias

The current `DEFAULT_AUDIENCE` in `AudienceDetailView.tsx` is about "busy women aged 28-42 buying skincare." Replace with a neutral, minimal default that works for any business type — just placeholder field names with empty/generic values.

### 7. Store `businessType` in brand metadata

In the persistence step of `BusinessDNAOnboarding.tsx` (~line 495), add `businessType` to the `newBrand` object so it's saved to `user_business_data` metadata and available downstream.

### 8. Update memory

Save the Onboarding Intelligence Model architecture to memory.

## Files Changed

1. `supabase/functions/scrape-product/index.ts` — Add business type classification in discover mode, broaden page picker and extraction prompts
2. `src/components/database/BusinessDNAOnboarding.tsx` — Dynamic labels/icons/headlines based on `businessType`, updated URL examples
3. `src/components/database/AudienceDetailView.tsx` — Replace ecommerce-biased DEFAULT_AUDIENCE with neutral defaults
4. `mem://business-dna/onboarding-intelligence-model` — New memory file

## What Will NOT Change

- The 7-step pipeline structure (Steps 0-6) stays identical
- `save-onboarding` edge function — already universal
- `enrich-brand` edge function — already works for any business type
- Image quality filters — already comprehensive per PDF §5.4
- Progress animation timing (4.5s ease-out) — already matches PDF
- Source verification carousel — already implemented
- Social proof extraction — already implemented
- Workspace creation logic — already implemented
- Reddit enrichment — already works universally

