---
name: Post-Onboarding DNA Mutation Model
description: Propagation rules for DNA changes — dashboard invalidation, employee unlink, orphan validation
type: feature
---

The DNA Mutation Model governs how Business DNA evolves safely after onboarding:

**Mutation Types** (all implemented in BusinessDNAContext):
1. Field Edit — diff-based save via useEffect watchers
2. Entity Addition — auto-persisted on state change
3. Cascade Delete — brand deletion removes linked products + audiences
4. Re-enrichment — brand refresh via refreshBrand()

**Propagation Rules**:
- `dna_mutated` custom event dispatched after every mutation (add/edit/delete)
- Dashboard localStorage cache (`dash_cards_<brandId>`) cleared on mutation
- ManageDashboardView listens for `dna_mutated` and shows "Regenerate" banner
- Brand deletion unlinks orphaned AI employees (`linked_business_id` → null) with toast notification

**Integrity Validation** (on data load):
- Products with `brandId` not in loaded brands → console warning
- Audiences with `productIds` referencing missing products → console warning
- Detection only — no auto-delete

**Caching Architecture**:
- Dual-ID: `_rowId` (DB primary key) + logical `id` (entity UUID)
- localStorage brand cache for instant breadcrumb rendering
- Cross-tab sync via `storage` + `workspace_changed` events
