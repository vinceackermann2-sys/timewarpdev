---
name: Employee Intelligence Model
description: Complete AI Employee lifecycle — 21-field schema, 5-step wizard, multi-step batching, 8 safety layers, quality scoring
type: feature
---

The AI Employee system implements a full lifecycle:

**Schema**: 21 fields on `ai_employees` table (name, role, sop_title, sop_purpose, sop_procedure[], sop_definitions, sop_documentation, sop_materials, sop_responsibilities, sop_revision_history, sop_safety_notes, sop_scope, linked_business_id, orb_colors, status, workspace_id, user_id, created_at, updated_at, id).

**Creation**: 5-step wizard in CreateEmployeeWizard (Role → Purpose → Procedure → Safety → Review). AI generates SOP from user prompt via `generate-employee` edge function.

**Execution Modes**:
- **Browser Mode**: Extension-based SOP execution via `run-employee` edge function. AI returns JSON actions (`navigate`, `click`, `type`, `extract`, `respond`, `done`). Supports multi-step batching with `{ "steps": [...] }` format for 2-5x faster execution.
- **Chat Mode**: Standard Q&A grounded in business DNA via RAG.

**Safety Layers** (8 total):
1. Blocked action keywords (pay, login, signup, sensitive data)
2. Safety regex patterns for payments, accounts, credentials
3. Manual takeover mode with user return control
4. Pause/resume execution flow
5. Abort controller for immediate stop
6. Extension tab group isolation
7. SOP safety_notes field for custom guardrails
8. Action consumption gating (plan balance check)

**Multi-Step Batching**: `parseAction` detects both single `{ "action": ... }` and batched `{ "steps": [...] }` formats. Batched actions execute sequentially with individual safety checks and logging. Conversation context is added only after the last action in a batch.

**Quality Scoring** (5 metrics, §7):
1. **SOP Completeness**: title + purpose + procedure + safety (4 fields, % filled)
2. **Safety Coverage**: whether sop_safety_notes is populated (0% or 100%)
3. **Business Grounding**: whether linked_business_id is set (0% or 100%)
4. **Execution Success Rate**: completed logs ÷ (completed + error logs)
5. **Output Quality**: completed messages > 100 chars ÷ total completed

Overall score = weighted average of available metrics. Displayed as progress bars in EmployeeDetailView.

**RAG Pipeline**: `run-employee` retrieves business context from `user_business_data` scoped by `linked_business_id` and workspace.

**Logging**: All steps logged to `ai_employee_logs` with status (running/completed/error), step_label, and message.
