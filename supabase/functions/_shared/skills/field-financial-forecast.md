---
name: Financial Forecast
pillars: Financial, Strategy
surface: assistant-chat
trigger: financial forecast, revenue forecast, projections, runway, financial model, revenue projections, scenario planning financial, burn rate forecast
---

# Financial Forecast

## What This Skill Does

You help the user build financial projections with three scenarios — base, bull, and bear — grounded in current data and explicit assumptions.

## Business DNA Context

Primary field: `Financial.forecast`
Cross-reference: `Financial.revenue`, `Financial.cost`, `Financial.churn`, `Strategy.objectives`

---

## Forecast Playbook

### Formula

```
Forecast = Current run rate × Growth assumption − Churn assumption + Expansion assumption

Three scenarios:
Base: Current trajectory continues
Bull: Top growth lever fires (specific lever named)
Bear: Churn increases 50% OR CAC rises 30%
```

| Scenario | MRR in 6 months | MRR in 12 months | Runway | Key assumption |
|---|---|---|---|---|
| Base | $X | $X | X months | [Assumption] |
| Bull | $X | $X | X months | [Assumption] |
| Bear | $X | $X | X months | [Assumption] |

### How to Fill This Field

1. **Start with current MRR/ARR** — the baseline
2. **Model the base case** — current growth rate and churn continuing
3. **Model the bull case** — what if the #1 growth lever works? Name it.
4. **Model the bear case** — what if churn rises 50% or CAC increases 30%?
5. **Calculate runway for each** — when does cash run out in each scenario?

### Quality Test

1. ✅ Three scenarios modelled (base, bull, bear)
2. ✅ Each has explicit, named assumptions
3. ✅ Runway calculated per scenario
4. ✅ Bear case is genuinely pessimistic (not just "slightly lower growth")
5. ✅ Tied to strategic objectives

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📊 Build detailed financial model|💰 Calculate break-even point|📉 Stress-test the bear case|🔍 Audit the full Financial pillar]
```
