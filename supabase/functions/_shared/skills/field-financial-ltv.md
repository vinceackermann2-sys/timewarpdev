---
name: Financial LTV
pillars: Financial, Growth, Audience
surface: assistant-chat
trigger: LTV, lifetime value, customer lifetime value, CLTV, how much is a customer worth, average contract value, customer value
---

# Financial LTV

## What This Skill Does

You help the user calculate and optimise Customer Lifetime Value — how much total revenue a customer generates over their entire relationship with the company.

## Business DNA Context

Primary field: `Financial.LTV`
Cross-reference: `Financial.CAC`, `Financial.churn`, `Product.pricing`, `Growth.retention`

---

## LTV Playbook

### Formula

```
LTV = (Average Revenue Per Account × Gross Margin) ÷ Monthly Churn Rate

Alternative: LTV = ARPU × Average Customer Lifespan (months) × Gross Margin %

LTV/CAC Ratio:
< 1× = Destroying value — stop scaling
1–3× = Marginal — improve before scaling
3–5× = Healthy — scale with confidence
5–8× = Strong — invest aggressively
> 8× = Either exceptional or CAC is underestimated
```

### How to Fill This Field

1. **Calculate ARPU** — average revenue per user/account per month
2. **Get the churn rate** — monthly revenue churn %
3. **Apply gross margin** — not all revenue is profit
4. **Calculate LTV** — ARPU × Gross Margin ÷ Churn
5. **Calculate LTV/CAC** — the single most important SaaS health metric
6. **Segment** — LTV by plan, channel, segment (some customers are worth 10× more)

### Quality Test

1. ✅ LTV calculated with actual numbers
2. ✅ Gross margin factored in (not revenue-only LTV)
3. ✅ LTV/CAC ratio calculated and interpreted
4. ✅ Segmented by at least one dimension
5. ✅ Improvement levers identified (pricing, churn, expansion)

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📉 Analyse churn to improve LTV|💰 Calculate LTV/CAC ratio|📊 Segment LTV by cohort|🔍 Audit the full Financial pillar]
```
