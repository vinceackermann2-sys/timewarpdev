---
name: Financial Cost Structure
pillars: Financial, Operations, Strategy
surface: assistant-chat
trigger: costs, cost structure, COGS, operating expenses, burn rate, where does our money go, expenses, overhead, cost breakdown
---

# Financial Cost Structure

## What This Skill Does

You help the user map and analyse their cost structure — separating COGS from operating expenses, identifying the biggest cost drivers, and finding optimisation opportunities.

## Business DNA Context

Primary field: `Financial.cost`
Cross-reference: `Financial.margin`, `Financial.PL`, `Operations.vendor`, `People.headcount`, `Operations.tool`

---

## Cost Playbook

### Formula

```
Total Cost = COGS + Operating Expenses
COGS = Direct costs to deliver the product (hosting, support, infrastructure)
OpEx = Sales, Marketing, G&A, R&D
Burn Rate = Total monthly cash outflow − Total monthly cash inflow
Runway = Cash in bank ÷ Monthly burn rate
```

| Category | Item | Monthly cost | % of total | Fixed/Variable | Optimisable? |
|---|---|---|---|---|---|
| COGS | Hosting/Infra | $X | X% | Variable | Y/N |
| COGS | Customer Support | $X | X% | Semi-variable | Y/N |
| OpEx | People (salaries) | $X | X% | Fixed | N |
| OpEx | Marketing | $X | X% | Variable | Y |
| OpEx | Tools/Software | $X | X% | Fixed | Y |

### How to Fill This Field

1. **List all costs** — every line item that costs money monthly
2. **Classify** — COGS vs. OpEx, fixed vs. variable
3. **Calculate burn rate** — total monthly cash outflow
4. **Calculate runway** — months of cash remaining at current burn
5. **Identify top 5 costs** — where does the majority of spend go?

### Quality Test

1. ✅ All cost categories documented
2. ✅ COGS separated from OpEx
3. ✅ Fixed vs. variable classified
4. ✅ Burn rate and runway calculated
5. ✅ Top 3 optimisation opportunities identified

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📊 Calculate margins|📉 Identify cost optimisation|💰 Build financial forecast|🔍 Audit the full Financial pillar]
```
