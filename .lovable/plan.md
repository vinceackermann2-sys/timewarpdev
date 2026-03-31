

## Plan: Redesign Onboarding / Add Business UI

### Summary
Replace the current `BusinessDNAOnboarding` component's visual design with the new UI from the uploaded zip file. The backend logic (scrape-product, save-onboarding, enrich-brand edge functions) stays exactly the same. The only behavioral difference: when adding a business from Business DNA, show the method picker ("From Scratch" / "From Existing"); during initial onboarding, skip straight to URL input.

### New Step Flow

```text
[Method Picker] → [URL Input] → [Analyzing] → [Product Selection] → [Product Image Picker] → [Forging DNA] → [Agent Name]
   (add-biz only)    step 0        step 1          step 2                 step 3                step 4-5          step 6
```

Mapped to backend:
- Steps 0-1: URL input + scrape-product call (same as current steps 0-1)
- Step 2: NEW — show extracted products as selectable cards (images from scrape data), user picks up to 3
- Step 3: NEW — for each selected product, pick the best product image from scraped images
- Steps 4-5: save-onboarding + enrich-brand calls (same as current step 2), with new "Data Found" / "Confirmed Data" tabs UI
- Step 6: Agent naming (same as current step 3)

### Design Language
- Background: `bg-[#fcfbf9]` (light cream) — matches the zip's warm neutral aesthetic
- Accent: `#3399ff` (blue) — consistent with existing primary
- Cards: `bg-[#f4f3ee]` with subtle borders
- Typography: `text-[#1a1f36]` for headings, `text-[#697386]` for secondary
- Rounded corners: `rounded-2xl` throughout
- No dark mode override needed (existing theme handles this)

### Changes

**File: `src/components/database/BusinessDNAOnboarding.tsx`** (full rewrite of render, keep all backend hooks/effects)
1. Keep all existing state, refs, effects for scraping, persistence, enrichment, progress animation
2. Add new state: `selectedProducts` (indices), `currentProductIndex`, `selectedImages` (per product), `isInfoOpen`, `isSourcesOpen`
3. After scrape completes, extract product list from `scrapeResult.current` and transition to product selection (step 2) instead of straight to persistence
4. Step 2 renders product cards in a 3-column grid with checkboxes, images from scraped data, "Continue" button
5. Step 3 renders image picker per product — grid of product images with selection circles, upload option, info accordion
6. Steps 4-5 trigger persistence (save-onboarding) + show "Forging DNA" UI with to-do list, sources tabs, Reddit-style quote placeholder
7. Step 6 is agent naming with the new clean input style (WandSparkles icon, blue border)
8. Method picker UI stays as-is (already matches the design)

**Key mapping**: The scrape result's `extracted.products[].images` array populates the image picker. The `selectedProducts` filter determines which products get passed to `save-onboarding`. The selected image index per product gets stored in the product entry.

### What Stays the Same
- All edge function calls (scrape-product, save-onboarding, enrich-brand)
- BusinessDNAContext integration
- Workspace resolution logic
- Auth session handling
- The method picker for add-business mode (already exists)
- Progress animation logic (reused for steps 4-5 instead of 1-2)

### What Changes
- Visual design of every step to match the zip's cream/blue aesthetic
- New intermediate steps (product selection + image picker) between scraping and persistence
- Step numbering adjusted (0→URL, 1→analyzing, 2→product cards, 3→image picker, 4-5→forging, 6→agent name)
- Products passed to save-onboarding filtered by user selection instead of all scraped products

