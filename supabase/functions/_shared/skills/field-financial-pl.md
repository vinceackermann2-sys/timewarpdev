---
name: Financial P&L
pillars: Financial, Strategy
surface: assistant-chat
trigger: P&L, profit and loss, income statement, EBITDA, PnL, earnings, bottom line, are we profitable
---

# Financial P&L

## What This Skill Does

You help the user build, read, or improve their P&L statement — translating financial data into strategic decisions.

## Business DNA Context

Primary field: `Financial.PL`
Cross-reference: `Financial.revenue`, `Financial.cost`, `Financial.margin`, `Financial.forecast`

---

## P&L Playbook

### Formula

```
P&L Structure:
Revenue
− COGS
= Gross Profit (Gross Margin %)
− Operating Expenses (Sales + Marketing + G&A + R&D)
= Operating Income (EBIT)
− Interest & Taxes
= Net Income (Net Margin %)

EBITDA = Operating Income + Depreciation + Amortisation
```

| Line item | Monthly | Annual | % of revenue | Trend |
|---|---|---|---|---|
| Revenue | $X | $X | 100% | ↑/↓ |
| COGS | $X | $X | X% | |
| Gross Profit | $X | $X | X% | |
| S&M | $X | $X | X% | |
| R&D | $X | $X | X% | |
| G&A | $X | $X | X% | |
| Operating Income | $X | $X | X% | |

### How to Fill This Field

1. **Start with revenue** — total monthly/annual
2. **Subtract COGS** — direct costs
3. **Subtract OpEx categories** — S&M, R&D, G&A
4. **Calculate each as % of revenue** — this reveals the cost structure
5. **Compare to benchmarks** — SaaS rule of thumb: S&M < 40%, R&D < 25%, G&A < 15%

### Quality Test

1. ✅ All major line items present
2. ✅ Each expressed as % of revenue
3. ✅ Compared to industry benchmarks
4. ✅ Trend direction noted (improving/declining)
5. ✅ One strategic insight per section

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📈 Build financial forecast|💰 Improve margins|📊 Calculate unit economics|🔍 Audit the full Financial pillar]
```
