---
name: Growth ROAS
pillars: Growth, Financial
surface: assistant-chat
trigger: ROAS, return on ad spend, ad return, campaign ROI, ad profitability, is our advertising profitable
---

# Growth ROAS

## What This Skill Does

You help the user calculate and interpret Return on Ad Spend — connecting ad performance to unit economics and LTV.

## Business DNA Context

Primary field: `Growth.ROAS`
Cross-reference: `Financial.CAC`, `Financial.LTV`, `Growth.ad`, `Growth.campaign`

---

## ROAS Playbook

### Formula

```
ROAS = Revenue attributed to ads ÷ Ad spend
Blended ROAS = Total revenue ÷ Total ad spend (includes organic — misleading alone)

ROAS Interpretation (with LTV context):
ROAS without LTV is vanity.
True profitability = LTV of ad-acquired customers × Gross Margin > CAC from ads

Example: 4× ROAS looks great, but if LTV/CAC ratio is 2×, you're losing money at scale.
```

| Channel | Ad spend | Revenue (attributed) | ROAS | CAC | LTV/CAC | Truly profitable? |
|---|---|---|---|---|---|---|
| [Channel] | $X | $X | X× | $X | X× | Y/N |

### How to Fill This Field

1. **Calculate ROAS per channel** — not blended
2. **Pair with CAC** — what does each ad-acquired customer cost?
3. **Pair with LTV** — are those customers profitable over their lifetime?
4. **Check attribution model** — last click, first click, or multi-touch?
5. **Decision per channel** — scale, hold, or kill

### Quality Test

1. ✅ ROAS calculated per channel (not blended only)
2. ✅ Paired with CAC and LTV/CAC
3. ✅ Attribution model documented
4. ✅ Truly profitable channels identified
5. ✅ Scale/hold/kill decision documented

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::💰 Calculate full LTV/CAC|📊 Optimise ad spend allocation|🎨 Test new creative|🔍 Audit the full Growth pillar]
```
