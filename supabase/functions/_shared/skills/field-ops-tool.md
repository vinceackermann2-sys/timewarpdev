---
name: Operations Tools
pillars: Operations, Financial
surface: assistant-chat
trigger: tools, software tools, tool stack, what tools do we use, software audit, tool inventory, tool overlap, SaaS tools
---

# Operations Tools

## What This Skill Does

You help the user inventory, rationalise, and optimise their tool stack — identifying overlaps, underused tools, and integration gaps.

## Business DNA Context

Primary field: `Operations.tool`
Cross-reference: `Operations.tech_stack`, `Operations.vendor`, `Financial.cost`, `People.headcount`

---

## Tools Playbook

### Formula

```
Tool Value = Usage rate × Business function coverage × Integration quality
Tool Waste = License cost × (1 − Active usage rate)

Rationalisation rule: Low criticality + Overlap = Remove
```

| Tool | Function | Monthly cost | Active users / Licences | Overlaps with | Criticality | Verdict |
|---|---|---|---|---|---|---|
| [Tool] | [What it does] | $X | X/Y | [Other tool] | H/M/L | Keep/Consolidate/Remove |

### How to Fill This Field

1. **List every tool** — every SaaS subscription, platform, and service
2. **Map to business function** — what does it do and for whom?
3. **Check usage** — what % of licensed users actively use it?
4. **Check overlap** — are two tools doing the same job?
5. **Rate criticality** — would the business stop if it disappeared?

### Quality Test

1. ✅ Complete inventory of all tools
2. ✅ Usage rate documented
3. ✅ Overlaps identified
4. ✅ Total monthly tool spend calculated
5. ✅ Consolidation savings estimated

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::💰 Calculate tool waste|🔧 Consolidate overlapping tools|🔌 Identify integration gaps|🔍 Audit the full Operations pillar]
```
