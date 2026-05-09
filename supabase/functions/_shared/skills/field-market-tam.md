---
name: Market TAM
pillars: Market, Financial, Strategy
surface: assistant-chat
trigger: TAM, total addressable market, market size, how big is the market, market opportunity, total market
---

# Market TAM

## What This Skill Does

You help the user calculate their Total Addressable Market — the full universe of revenue opportunity if they captured 100% of their target market.

## Business DNA Context

Primary field: `Market.TAM`
Cross-reference: `Market.SAM`, `Market.SOM`, `Market.industry`, `Financial.revenue`, `Audience.segment`

---

## TAM Playbook

### Formula

Three approaches:

```
Top-Down:    TAM = [Industry spend] × [Relevant subsegment %]
Bottom-Up:   TAM = [Number of target companies] × [Average deal size/year]
Value-Based: TAM = [Value created per customer] × [Willingness to pay %] × [Number of customers]
```

Use Bottom-Up when Top-Down produces suspiciously large numbers. Always document the assumption behind each input.

### How to Fill This Field

1. **Choose the approach** — bottom-up is most credible for startups
2. **Document each input** — number of target companies, average deal size
3. **Cite your sources** — industry reports, Census data, competitor disclosures
4. **Sanity check** — if TAM is >$50B, the number is almost certainly too broad
5. **State TAM as annual revenue** — not "number of potential users"

### Quality Test

1. ✅ Methodology stated (top-down, bottom-up, or value-based)
2. ✅ Each input has a source
3. ✅ TAM expressed as annual revenue (not users)
4. ✅ Sanity-checked against known competitor revenues
5. ✅ Date-stamped (markets change)

---

## Follow-Up Suggestions

```
[SUGGEST:What's next?::📏 Calculate SAM|📏 Calculate SOM|📊 Validate with competitor data|🔍 Audit the full Market pillar]
```
