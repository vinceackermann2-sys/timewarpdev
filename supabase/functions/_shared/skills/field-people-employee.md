---
name: People Employee
pillars: People
surface: assistant-chat
trigger: employees, current team, team members, who works here, team roster, employee list, our people
---

# People Employee

## What This Skill Does

You help the user document their current team — roles, strengths, and capabilities — to identify gaps and single points of failure.

## Business DNA Context

Primary field: `People.employee`
Cross-reference: `People.org_chart`, `People.headcount`, `Strategy.objectives`

---

## Employee Playbook

### Formula

```
Team Map = [Name] × [Role] × [Key strength] × [Criticality] × [Tenure risk]

Criticality: Would the business stop if they left tomorrow?
Bus factor: How many people can do this person's job? (1 = existential risk)
```

| Name | Role | Key strength | Bus factor | Tenure risk | Note |
|---|---|---|---|---|---|
| [Name] | [Title] | [Best at] | [1–3+] | [Low/Med/High] | [Flight risk signals] |

### How to Fill This Field

1. **List all team members** with role and function
2. **Note key strengths** — what is each person uniquely good at?
3. **Calculate bus factor** — if they left, who else can do their job?
4. **Assess tenure risk** — any signals of disengagement or flight risk?
5. **Flag single points of failure** — bus factor = 1 is urgent

### Quality Test

1. ✅ All team members listed with roles
2. ✅ Key strength noted per person
3. ✅ Bus factor assessed
4. ✅ Single points of failure flagged
5. ✅ Connected to strategic capability needs

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::🏗️ Design the org structure|🧑‍💼 Identify the next critical hire|📊 Assess team health|🔍 Audit the full People pillar]
```
