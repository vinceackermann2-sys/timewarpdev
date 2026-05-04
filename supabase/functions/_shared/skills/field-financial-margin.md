---
name: Financial Margin
pillars: Financial, Product, Strategy
surface: assistant-chat
trigger: margins, gross margin, net margin, contribution margin, margin analysis, margin improvement, profit margin
---

# Financial Margin

## What This Skill Does

You help the user calculate, benchmark, and improve their margin profile — gross margin, contribution margin, and net margin.

## Business DNA Context

Primary field: `Financial.margin`
Cross-reference: `Financial.revenue`, `Financial.cost`, `Financial.PL`, `Product.pricing`

---

## Margin Playbook

### Formula

```
Gross Margin = (Revenue − COGS) ÷ Revenue × 100
Contribution Margin = (Revenue − Variable Costs) ÷ Revenue × 100
Net Margin = (Revenue − All Costs) ÷ Revenue × 100

SaaS Benchmarks:
- Gross Margin: 70–85% (healthy), <60% (concern)
- Net Margin: varies by stage (growth-stage often negative)
```

| Margin type | Current | Benchmark | Gap | Lever to improve |
|---|---|---|---|---|
| Gross | X% | 75% (SaaS) | ±X% | [Action] |
| Contribution | X% | 60% | ±X% | [Action] |
| Net | X% | Varies | — | [Action] |

### How to Fill This Field

1. **Calculate gross margin** — revenue minus COGS
2. **Calculate contribution margin** — revenue minus variable costs
3. **Benchmark against industry** — SaaS, services, marketplace?
4. **Identify the biggest margin drag** — what cost is most compressing margins?
5. **Model improvement scenarios** — what happens if you reduce the top cost by 20%?

### Quality Test

1. ✅ Gross margin calculated with current numbers
2. ✅ Benchmarked against industry standard
3. ✅ Biggest margin drag identified
4. ✅ Improvement lever named with potential impact
5. ✅ Trend documented (improving or declining)

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📊 Build P&L summary|💰 Improve unit economics|📈 Model margin scenarios|🔍 Audit the full Financial pillar]
```
