

# Implement Employee Intelligence Model — Multi-Step Batching + Quality Scoring

## Summary

The PDF documents the complete AI Employee lifecycle. Most of it is already implemented. Two concrete gaps remain:

1. **Multi-step batching** — The AI prompt already tells the model to return `{ "steps": [...] }` arrays for faster browser automation, but `parseAction` in `EmployeeDetailView.tsx` only parses single `{ "action": ... }` objects. Multi-action responses are silently dropped.

2. **Quality scoring** — PDF §7 defines 5 quality metrics that should be visible on each employee. None are currently calculated or displayed.

## Plan

### 1. Add multi-step batching to `EmployeeDetailView.tsx`

**What changes:**
- Update `parseAction` to also detect `{ "steps": [...] }` format and return an array of actions
- Update the execution loop in `handleRun` (~line 348): when `parseAction` returns an array, iterate through each sub-action sequentially — safety-check each one, execute it, log it, then proceed to the next before requesting a new AI response
- This makes browser automation 2-5x faster as documented in the PDF

### 2. Add quality score display to `EmployeeDetailView.tsx`

**What changes:**
Add a small "Quality Score" section below the employee details that calculates 5 metrics from existing data:

- **SOP Completeness**: Count of non-empty procedure steps ÷ expected fields
- **Safety Coverage**: Whether `sop_safety_notes` is populated
- **Business Grounding**: Whether `linked_business_id` is set (and whether linked brand has products/audiences)
- **Execution Success Rate**: Completed logs ÷ (completed + error logs)
- **Output Quality**: Done messages > 100 chars with structured content

Display as simple progress bars or score badges — purely client-side calculation from existing employee fields and logs.

### 3. Save architecture to memory

Save the Employee Intelligence Model to `mem://features/employee-intelligence-model`.

## Files Changed

1. `src/components/database/EmployeeDetailView.tsx` — Multi-step batching in parseAction + execution loop, quality score UI section
2. `mem://features/employee-intelligence-model` — Architecture memory

## What Will NOT Change

- Employee schema (21 fields) — already matches PDF exactly
- 5-step creation wizard — already implemented
- 8 safety layers — already implemented
- Chat mode / browser mode split — already implemented
- RAG pipeline — already implemented
- Logging system — already implemented
- `run-employee` edge function — no changes needed

