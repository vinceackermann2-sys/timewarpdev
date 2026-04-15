

# Business DNA 9-Pillar Intelligence Model

## What This Does

Restructures the Business DNA system from the current 3+2 segments (Brand, Product, Audience, Database, Settings) to the full 9-pillar model from your document. When data enters via URL scrape, file upload, or integration sync, the AI Data Classification Engine (DCE) analyzes it and routes relevant information into the correct pillar fields -- only filling fields where the data genuinely aligns. No fabricated data.

## The 9 Pillars

1. **Brand** -- Identity, voice, visual identity, positioning, perception
2. **Product** -- Features, pricing, mechanism, USPs, social proof, roadmap
3. **Audience** -- Personas, journey map, pain points, language patterns, triggers
4. **Market** -- TAM/SAM/SOM, competitors, trends, regulations, SWOT
5. **Financial** -- Business model, revenue, costs, unit economics, projections
6. **Operations** -- Processes, tech stack, vendors, KPIs, compliance
7. **People** -- Org structure, capabilities, culture, hiring, attrition
8. **Growth** -- Channels, funnels, campaigns, creative intelligence, retention
9. **Strategy** -- Vision, objectives, bets, scenarios, milestones

Plus the existing **Database** (raw data) and **Settings** tabs remain.

---

## Technical Plan

### 1. Update `BRAIN_SEGMENTS` in `BusinessDNAView.tsx`

Expand from 5 tabs to 11 tabs (9 pillars + Database + Settings). Add new icons for each pillar (TrendingUp, DollarSign, Cog, Users2, Rocket, Target). Each new pillar uses the existing `SegmentContent` component pattern (list of insights with add/edit/delete).

### 2. Update `categorize-dna` Edge Function

Replace the current 3-category system prompt with the full 9-pillar classification schema. The AI receives the document's signal detection table as its classification guide:

- **brand**: mission, vision, values, voice, tone, logo, color, positioning
- **product**: features, benefits, pricing, SKU, mechanism, USP, warranty
- **audience**: persona, segment, pain point, testimonial, buyer, NPS
- **market**: competitor, TAM, industry, trend, regulation, SWOT, landscape
- **financial**: revenue, cost, margin, P&L, CAC, LTV, churn, forecast
- **operations**: process, workflow, SOP, vendor, tool, compliance, KPI
- **people**: employee, headcount, org chart, hire, salary, culture, HR
- **growth**: campaign, ad, email, funnel, CTR, ROAS, creative, channel
- **strategy**: vision, objective, OKR, milestone, roadmap, scenario, bet

The function maps each data item to the most relevant pillar(s), extracts a concise insight, and stores it in `metadata.dna_segment`. A single document can produce insights for multiple pillars (multi-pillar mapping).

### 3. Update `analyze-content` Edge Function

Add a DCE classification step after content analysis. When content is analyzed, the system also determines which pillar(s) the content belongs to and stores the classification in `metadata.dna_pillars` (array of pillar IDs). This happens automatically on every URL scrape, file upload, and integration data sync.

### 4. Update `save-onboarding` Edge Function

Ensure brand/product/audience data created during onboarding includes proper `metadata.dna_segment` tags so they appear in the correct pillar tabs immediately.

### 5. Wire New Pillar Tabs to Data

Each new pillar tab (Market, Financial, Operations, People, Growth, Strategy) renders using the same `SegmentContent` component. Data is fetched by filtering `user_business_data` rows where `metadata->>'dna_segment'` matches the pillar ID, scoped to the active brand.

### 6. Save Memory

Store the complete 9-pillar schema and DCE classification signals as a project memory for consistent AI grounding across all edge functions.

---

## What Will NOT Change

- The existing Brand, Product, and Audience detail views (BrandListView, ProductListView, AudienceListView) remain as-is -- they are the deep-dive editors
- Database and Settings tabs stay
- No new database tables needed -- uses existing `user_business_data` with `metadata.dna_segment`
- No fake data -- fields only populate when the AI finds genuine signal alignment

