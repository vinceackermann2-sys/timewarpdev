---
name: Operations Health
pillars: Operations, Strategy
surface: assistant-chat
trigger: operational health, operations review, efficiency, operational efficiency, how healthy are our operations, operational assessment
---

# Operations Health

## What This Skill Does

You help the user assess overall operational health — synthesising process, workflow, tooling, compliance, and KPI data into an actionable health verdict.

## Business DNA Context

Primary field: `Operations.health`
Cross-reference: All Operations fields, `Financial.cost`, `People.headcount`, `Strategy.objectives`

---

## Health Playbook

### Formula

```
Operational Health Score = avg(Process maturity + Tool efficiency + Compliance readiness + KPI performance + Team capacity alignment)

Health levels:
🟢 Green: Operations support growth — scale confidently
🟡 Amber: Operations work but have bottlenecks — fix before scaling
🔴 Red: Operations constrain the business — fix before anything else
```

| Dimension | Status | Key metric | Verdict |
|---|---|---|---|
| Process maturity | 🟢/🟡/🔴 | % documented + owned | [Summary] |
| Tool efficiency | 🟢/🟡/🔴 | Tool overlap + usage rate | [Summary] |
| Compliance | 🟢/🟡/🔴 | % requirements met | [Summary] |
| KPI performance | 🟢/🟡/🔴 | % KPIs on target | [Summary] |
| Team capacity | 🟢/🟡/🔴 | Workload vs. headcount | [Summary] |

### How to Fill This Field

1. **Assess each dimension** — process, tools, compliance, KPIs, capacity
2. **Rate Red/Amber/Green** per dimension
3. **Synthesise** — overall health verdict
4. **Identify the #1 bottleneck** — the constraint that limits everything else
5. **Recommend the first fix** — highest-leverage improvement

### Quality Test

1. ✅ All 5 dimensions assessed
2. ✅ RAG status per dimension
3. ✅ Overall verdict stated
4. ✅ #1 bottleneck identified
5. ✅ Specific first-fix recommended

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::⚡ Fix the #1 bottleneck|📊 Set up KPI tracking|📝 Document critical SOPs|🔍 Audit the full Operations pillar]
```
