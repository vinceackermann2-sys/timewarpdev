---
name: Strategy Scenarios
pillars: Strategy, Financial
surface: assistant-chat
trigger: scenario planning, scenarios, what if, base case, bear case, bull case, contingency planning, strategic scenarios
---

# Strategy Scenarios

## What This Skill Does

You help the user build scenario plans — base, bull, and bear cases with probability estimates, triggers, and pre-planned responses.

## Business DNA Context

Primary field: `Strategy.scenarios`
Cross-reference: `Financial.forecast`, `Market.trends`, `Strategy.bets`, `Strategy.risk_appetite`

---

## Scenarios Playbook

### Formula

```
Scenario = [Name] + [Key assumption] + [Probability] + [Impact] + [Response plan]

Three scenarios minimum:
Base: Current trajectory continues
Bull: Best-case catalysts materialise
Bear: Key risks materialise
```

| Scenario | Key assumption | Probability | Revenue impact | Response plan |
|---|---|---|---|---|
| Base | Growth continues at current rate | 50% | $X ARR by date | Continue current plan |
| Bull | [Specific catalyst] | 25% | $X ARR by date | [How to accelerate] |
| Bear | [Specific risk] | 25% | $X ARR by date | [How to defend] |

### How to Fill This Field

1. **Define base case** — current trajectory with no surprises
2. **Define bull case** — name the specific catalyst (not "things go well")
3. **Define bear case** — name the specific risk (not "things go badly")
4. **Assign probabilities** — must sum to 100%
5. **Pre-plan responses** — what do you do if each scenario triggers?

### Quality Test

1. ✅ Three scenarios minimum
2. ✅ Each has a specific, named assumption
3. ✅ Probabilities assigned
4. ✅ Financial impact quantified per scenario
5. ✅ Response plan pre-defined (not "we'll figure it out")

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📊 Model financial impact per scenario|🛡️ Build bear-case defences|📈 Plan bull-case acceleration|🔍 Audit the full Strategy pillar]
```
