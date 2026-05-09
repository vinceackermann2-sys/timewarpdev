---
name: Financial CAC
pillars: Financial, Growth
surface: assistant-chat
trigger: CAC, customer acquisition cost, cost per acquisition, CPA, acquisition cost, how much does a customer cost, cost to acquire
---

# Financial CAC

## What This Skill Does

You help the user calculate, segment, and optimise their Customer Acquisition Cost — the total cost to acquire one paying customer, broken down by channel.

## Business DNA Context

Primary field: `Financial.CAC`
Cross-reference: `Financial.LTV`, `Growth.channel`, `Growth.ROAS`, `Growth.campaign`, `Product.pricing`

---

## CAC Playbook

### Formula

```
Blended CAC = Total Sales & Marketing Spend ÷ Number of New Customers
Channel CAC = Channel Spend ÷ Customers Acquired from Channel
Fully-Loaded CAC = (S&M Spend + S&M Salaries + Tools) ÷ New Customers

CAC Payback Period = CAC ÷ Monthly Gross Margin per Customer
```

**CRITICAL: Never average CAC across channels.** Blended CAC hides the best and worst performers.

| Channel | Spend | Customers | CAC | LTV/CAC | Payback | Verdict |
|---|---|---|---|---|---|---|
| Paid Search | $X | N | $X | X× | X months | Scale/Hold/Kill |
| Paid Social | $X | N | $X | X× | X months | |
| SEO/Content | $X | N | $X | X× | X months | |
| Referral | $X | N | $X | X× | X months | |

### How to Fill This Field

1. **Calculate blended CAC** — total S&M ÷ new customers
2. **Break down by channel** — which channels produce the cheapest customers?
3. **Calculate fully-loaded CAC** — include salaries, tools, overhead
4. **Calculate payback period** — how many months to recover CAC?
5. **Pair with LTV** — CAC alone means nothing; LTV/CAC is the metric

### Quality Test

1. ✅ Blended AND channel-level CAC calculated
2. ✅ Fully-loaded (includes salaries + tools)
3. ✅ Payback period calculated
4. ✅ LTV/CAC ratio stated per channel
5. ✅ Clear verdict per channel: scale, hold, or kill

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📊 Calculate LTV/CAC ratio|📈 Optimise highest-CAC channel|💰 Model CAC reduction scenarios|🔍 Audit the full Financial pillar]
```
