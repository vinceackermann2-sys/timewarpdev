---
name: Financial Churn
pillars: Financial, Growth, Product
surface: assistant-chat
trigger: churn rate, churn analysis, revenue churn, customer churn, retention rate, why are customers leaving, churn diagnosis
---

# Financial Churn

## What This Skill Does

You help the user measure, diagnose, and reduce churn — separating customer churn from revenue churn, analysing cohorts, and identifying where in the journey churn concentrates.

## Business DNA Context

Primary field: `Financial.churn`
Cross-reference: `Financial.LTV`, `Growth.retention`, `Audience.NPS`, `Product.social_proof`

---

## Churn Playbook

### Formula

```
Customer Churn Rate = Customers lost in period ÷ Customers at start of period
Revenue Churn Rate = MRR lost in period ÷ MRR at start of period
Net Revenue Retention (NRR) = (Starting MRR + Expansion − Contraction − Churn) ÷ Starting MRR

NRR > 100% = Expansion exceeds churn (the compounding case)
NRR < 100% = Shrinking without new customers

A 1% improvement in churn has MORE impact than a 1% improvement in conversion at scale.
```

| Churn type | Rate | Benchmark | Gap | Timing |
|---|---|---|---|---|
| Customer churn (monthly) | X% | 3–5% (SMB), 1–2% (Enterprise) | ±X% | [When] |
| Revenue churn (monthly) | X% | 1–3% | ±X% | [When] |
| Net Revenue Retention | X% | >100% | ±X% | |

### How to Fill This Field

1. **Calculate customer churn** — % of customers who cancelled
2. **Calculate revenue churn** — % of MRR lost (different with tiered pricing)
3. **Calculate NRR** — is expansion outpacing churn?
4. **Analyse by cohort** — does churn differ by channel, plan, or onboarding path?
5. **Find the churn timing** — Month 1? Month 3? At renewal? Timing reveals cause.

### Quality Test

1. ✅ Customer AND revenue churn calculated separately
2. ✅ NRR calculated
3. ✅ Benchmarked against stage-appropriate standards
4. ✅ Churn timing identified (when in the lifecycle)
5. ✅ Top 3 churn reasons documented from exit surveys or support data

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::🔍 Diagnose churn root causes|📈 Build retention improvement plan|💰 Model churn impact on LTV|🔍 Audit the full Financial pillar]
```
