---
name: Operations SOP
pillars: Operations
surface: assistant-chat
trigger: SOP, standard operating procedure, documented procedures, playbook, how-to guide, process documentation, runbook
---

# Operations SOP

## What This Skill Does

You help the user create structured, actionable SOPs for repeatable tasks — focused on the highest-impact processes first.

## Business DNA Context

Primary field: `Operations.SOP`
Cross-reference: `Operations.process`, `Operations.workflow`, `People.ops`

---

## SOP Playbook

### Formula

```
SOP = Trigger + Owner + Steps + Handoff + QA Check

Prioritise SOPs for:
1. Highest-volume process
2. Process most dependent on one person (bus factor = 1)
3. Process with highest error rate
```

**SOP Template:**
```
Name: [Process name]
Trigger: [What starts this process]
Owner: [Who executes]
Steps:
  1. [Specific action — no ambiguous verbs like "coordinate"]
  2. [Specific action]
  3. [Specific action]
Handoff: [When/how output transfers to next person/system]
QA Check: [How to verify it was done correctly]
Time: [Expected duration]
Frequency: [How often this runs]
```

### How to Fill This Field

1. **Pick the top-priority process** — highest volume, highest risk, or bus factor = 1
2. **Watch someone do it** — document what actually happens, not what should happen
3. **Write specific steps** — "Click Export > Select CSV > Upload to [system]" not "Export the data"
4. **Add the QA check** — how does someone verify the SOP was followed?
5. **Test with a new person** — if they can't follow it without help, it's not clear enough

### Quality Test

1. ✅ Trigger condition specified
2. ✅ Owner assigned
3. ✅ Steps use specific verbs (not "manage" or "coordinate")
4. ✅ Handoff point documented
5. ✅ QA check included

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📝 Write another SOP|🔧 Identify processes needing SOPs|⚡ Automate SOP steps|🔍 Audit the full Operations pillar]
```
