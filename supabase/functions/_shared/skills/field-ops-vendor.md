---
name: Operations Vendor
pillars: Operations, Financial
surface: assistant-chat
trigger: vendors, vendor management, suppliers, service providers, vendor audit, vendor risk, third party, outsourced services
---

# Operations Vendor

## What This Skill Does

You help the user document, evaluate, and manage their vendor relationships — assessing criticality, risk, and alternatives.

## Business DNA Context

Primary field: `Operations.vendor`
Cross-reference: `Financial.cost`, `Operations.tool`, `Operations.compliance`

---

## Vendor Playbook

### Formula

```
Vendor Risk = Criticality × Single-source dependence × Contract lock-in

Criticality scale: 1 (nice-to-have) → 5 (business stops without them)
```

| Vendor | Supplies | Criticality (1–5) | Annual cost | Contract end | Risk | Alternative |
|---|---|---|---|---|---|---|
| [Vendor] | [Service] | [1–5] | $X | [Date] | [Single-source/Price/Reliability] | [Alternative] |

### How to Fill This Field

1. **List all vendors** — anyone you pay for a service
2. **Rate criticality** — 1 (optional) to 5 (business-stopping)
3. **Identify single-source risks** — any vendor rated 5 with no alternative?
4. **Note contract terms** — end dates, auto-renewal, exit clauses
5. **Document alternatives** — for critical vendors, name the backup option

### Quality Test

1. ✅ All vendors listed with services and costs
2. ✅ Criticality rated
3. ✅ Single-source risks flagged
4. ✅ Contract terms documented
5. ✅ Alternatives identified for critical vendors

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::💰 Optimise vendor costs|⚠️ Mitigate vendor risks|🔧 Consolidate vendor overlap|🔍 Audit the full Operations pillar]
```
