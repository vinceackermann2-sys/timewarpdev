---
name: Business DNA 9-Pillar Model
description: Complete 9-pillar intelligence schema with 86 fields aligned to TimeWarp Business DNA Model doc, including DCE signal detection keywords
type: feature
---

## 9 Pillars (86 fields total — exact doc alignment)

| Pillar | ID | Fields | Signal Keywords |
|--------|-----|--------|-----------------|
| Brand | brand | 11 | mission, vision, values, voice, tone, logo, color, positioning, reputation, brand promise |
| Product | product | 15 | features, benefits, pricing, SKU, mechanism, USP, social proof, roadmap |
| Audience | audience | 13 | persona, segment, pain point, testimonial, buyer, NPS, journey, triggers, objections |
| Market | market | 9 | competitor, TAM, SAM, SOM, industry, trend, regulation, SWOT, landscape |
| Financial | financial | 9 | revenue, cost, margin, P&L, CAC, LTV, churn, forecast |
| Operations | operations | 9 | process, workflow, SOP, vendor, tool, compliance, KPI, tech stack |
| People | people | 9 | employee, headcount, org chart, hire, salary, culture, HR |
| Growth | growth | 10 | campaign, ad, email, funnel, CTR, ROAS, creative, channel, retention |
| Strategy | strategy | 11 | vision, objective, OKR, decision framework, risk appetite, milestone, scenario |

## Doc-Aligned Value Formulas

Every table-type field uses the doc's prescribed column schema (e.g., Brand Voice = `Component | What It Is | How Determined`, Vendors = `Vendor | Supplies | Criticality 1-5 | Risk | Alternative`, Strategic Bets = `Bet | Thesis | Resources | Success Signal | Kill Signal`). The mapper (`pillarDataMapper.ts`) and AI generator (`enrich-pillars` edge function) both adhere to these formulas.

## Recent Changes

- Product: added `13. Social Proof` and `14. Product Roadmap`; checklist renumbered to 15
- Audience: split into `1. Audience Description` + `2. Segmentation Model` + `3. Buyer Persona`
- Strategy: replaced `Strategic Priorities`/`Strategic Decisions Log` with doc-mandated `6. Decision Framework` and `7. Risk Appetite & Tolerance`; renamed `s8` to `Strategic Milestones`

## Data Storage

- Uses existing `user_business_data` table
- `metadata.dna_segment` = primary pillar ID
- `metadata.dna_pillars` = array of all matching pillar IDs
- `metadata.dna_insight` = extracted insight text

## Classification Engine (DCE)

- `categorize-dna` edge function: bulk categorization of existing data into 9 pillars
- `analyze-content` edge function: auto-classifies on ingest using gemini-2.5-flash-lite
- `save-onboarding`: tags brand/product/audience with their respective dna_segment on creation
- `enrich-pillars` edge function: generates the 6 extended pillars (market, financial, operations, people, growth, strategy) from brand+product+audience context using gemini-3-flash-preview, with output JSON shapes matching the doc's formulas
- Only fills pillars with genuine signal alignment — never fabricates data
