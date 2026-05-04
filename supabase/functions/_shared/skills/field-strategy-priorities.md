---
name: Strategy Priorities
pillars: Strategy
surface: assistant-chat
trigger: strategic priorities, priorities, what matters most, priority stack, quarterly priorities, what should we focus on, priority ranking
---

# Strategy Priorities

## What This Skill Does

You help the user rank their strategic priorities for the current quarter — forcing a stack rank where #1 beats everything else when resources conflict.

## Business DNA Context

Primary field: `Strategy.priorities`
Cross-reference: `Strategy.objectives`, `Strategy.bets`, `People.headcount`, `Financial.forecast`

---

## Priorities Playbook

### Formula

```
Priority Stack = Forced rank of initiatives where #1 always wins in a resource conflict

Rule: If everything is "High priority", nothing is prioritised.
Maximum: 5 priorities per quarter. 3 is better.
```

| Rank | Priority | Owner | Resource allocation | Why this rank |
|---|---|---|---|---|
| #1 | [Initiative] | [Who] | [% of team/budget] | [Why it beats #2] |
| #2 | [Initiative] | [Who] | [% of team/budget] | [Why it beats #3] |
| #3 | [Initiative] | [Who] | [% of team/budget] | |

### How to Fill This Field

1. **List all candidate priorities** — everything competing for attention
2. **Force rank them** — if #1 and #2 need the same engineer, #1 wins
3. **Assign owners** — one owner per priority
4. **Allocate resources** — % of team and budget per priority
5. **Explain the rank** — why does #1 beat #2?

### Quality Test

1. ✅ Stack-ranked (not "all high")
2. ✅ Maximum 5 (ideally 3)
3. ✅ Each has an owner
4. ✅ Resource allocation documented
5. ✅ Rank reasoning explained

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::🎯 Write OKRs for top priority|📊 Align team to priorities|🗺️ Build execution roadmap|🔍 Audit the full Strategy pillar]
```
