---
name: Growth Channel
pillars: Growth, Financial, Strategy
surface: assistant-chat
trigger: acquisition channels, growth channels, channel mix, channel analysis, best channels, where do customers come from, channel strategy
---

# Growth Channel

## What This Skill Does

You help the user evaluate and prioritise acquisition channels — based on CAC, volume ceiling, LTV/CAC ratio, and trend.

## Business DNA Context

Primary field: `Growth.channel`
Cross-reference: `Financial.CAC`, `Financial.LTV`, `Audience.persona`, `Growth.campaign`

---

## Channel Playbook

### Formula

```
Channel Priority = Low CAC × High LTV/CAC × High volume ceiling × Upward trend

Channel Maturity: Testing → Validated → Scaling → Saturating → Declining
```

| Channel | CAC | LTV/CAC | Volume ceiling | Trend | Maturity | Verdict |
|---|---|---|---|---|---|---|
| Paid Search | $X | X× | High/Med/Low | ↑/→/↓ | [Stage] | Scale/Hold/Test/Kill |
| Paid Social | $X | X× | | | | |
| SEO/Content | $X | X× | | | | |
| Email | $X | X× | | | | |
| Referral | $X | X× | | | | |
| Partnerships | $X | X× | | | | |

### How to Fill This Field

1. **List all channels** — paid, organic, referral, partnerships
2. **Calculate CAC per channel** — not blended
3. **Assess volume ceiling** — can this channel scale 10×?
4. **Check trend** — improving, flat, or declining?
5. **Prioritise** — focus on channels with best CAC × volume × trend

### Quality Test

1. ✅ All active channels listed
2. ✅ CAC calculated per channel
3. ✅ Volume ceiling assessed
4. ✅ Clear prioritisation with verdict
5. ✅ Connected to persona (is the ICP actually on this channel?)

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📊 Deep-dive best channel|🆕 Test a new channel|💰 Optimise CAC on worst channel|🔍 Audit the full Growth pillar]
```
