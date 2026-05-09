---
name: Strategy Risk Appetite
pillars: Strategy, Financial
surface: assistant-chat
trigger: risk appetite, risk tolerance, what risks, how much risk, risk profile, risk framework, acceptable risk
---

# Strategy Risk Appetite

## What This Skill Does

You help the user define their risk appetite across financial, product, reputational, and regulatory dimensions — turning "we're comfortable with risk" into specific declarations.

## Business DNA Context

Primary field: `Strategy.risk_appetite`
Cross-reference: `Strategy.bets`, `Strategy.decision_framework`, `Financial.forecast`, `Market.regulations`

---

## Risk Appetite Playbook

### Formula

```
Risk Appetite = [Category] × [Maximum acceptable exposure] × [What we will never do]
```

| Risk category | We WILL accept | We will NEVER accept | Current exposure |
|---|---|---|---|
| Financial | Max X% burn increase for growth bet | Runway below 6 months | [Current] |
| Product | Ship MVP to learn fast | Skip security testing | [Current] |
| Reputational | Controversial positioning | Misleading claims | [Current] |
| Regulatory | Operate in grey areas with legal review | Violate data privacy laws | [Current] |

### How to Fill This Field

1. **Define categories** — financial, product, reputational, regulatory
2. **For each, state what you WILL accept** — the boundary of acceptable risk
3. **For each, state what you NEVER accept** — the hard line
4. **Assess current exposure** — where are you today vs. the stated appetite?
5. **Connect to strategic bets** — are current bets within appetite?

### Quality Test

1. ✅ 4 risk categories addressed
2. ✅ Each has a "will accept" boundary
3. ✅ Each has a "never accept" hard line
4. ✅ Current exposure assessed
5. ✅ Connected to active strategic bets

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::🃏 Evaluate strategic bets against risk|📊 Scenario planning|⚖️ Build decision framework|🔍 Audit the full Strategy pillar]
```
