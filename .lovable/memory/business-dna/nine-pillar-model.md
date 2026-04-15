---
name: Business DNA 9-Pillar Model
description: Complete 9-pillar intelligence schema with DCE signal detection keywords for AI classification
type: feature
---

## 9 Pillars

| Pillar | ID | Signal Keywords |
|--------|-----|-----------------|
| Brand | brand | mission, vision, values, voice, tone, logo, color, positioning, reputation, brand promise |
| Product | product | features, benefits, pricing, SKU, mechanism, USP, warranty, roadmap, social proof |
| Audience | audience | persona, segment, pain point, testimonial, buyer, NPS, journey, triggers, objections |
| Market | market | competitor, TAM, SAM, SOM, industry, trend, regulation, SWOT, landscape, market share |
| Financial | financial | revenue, cost, margin, P&L, CAC, LTV, churn, forecast, pricing model, break-even |
| Operations | operations | process, workflow, SOP, vendor, tool, compliance, KPI, tech stack, automation |
| People | people | employee, headcount, org chart, hire, salary, culture, HR, attrition, team |
| Growth | growth | campaign, ad, email, funnel, CTR, ROAS, creative, channel, retention, referral |
| Strategy | strategy | vision, objective, OKR, milestone, roadmap, scenario, bet, pivot, exit |

## Data Storage

- Uses existing `user_business_data` table
- `metadata.dna_segment` = primary pillar ID
- `metadata.dna_pillars` = array of all matching pillar IDs
- `metadata.dna_insight` = extracted insight text

## Classification Engine (DCE)

- `categorize-dna` edge function: bulk categorization of existing data into 9 pillars
- `analyze-content` edge function: auto-classifies on ingest using gemini-2.5-flash-lite
- `save-onboarding`: tags brand/product/audience with their respective dna_segment on creation
- Only fills pillars with genuine signal alignment — never fabricates data
