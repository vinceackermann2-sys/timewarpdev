

## Plan: Replace SiriOrb with BusinessBrainOrb and use Bot icon in sidebar

### Changes

1. **Sidebar menu icon** (`DatabaseSidebar.tsx`, line 158): Replace `<SiriOrb size="16px" ...>` with `<Bot className="h-4 w-4" />` from lucide-react. Add `Bot` to the import list.

2. **Employees page — replace all SiriOrb usages with BusinessBrainOrb** (`EmployeesView.tsx`):
   - Import `BusinessBrainOrb` instead of `SiriOrb`
   - Empty state orb (line 117): `<BusinessBrainOrb size={96} className="mb-6" />`
   - Employee card orbs (line 151-156): `<BusinessBrainOrb size={56} className="group-hover:scale-105 transition-transform" />`

3. **Employee detail view** (`EmployeeDetailView.tsx`):
   - Import `BusinessBrainOrb` instead of `SiriOrb`
   - Replace the detail orb with `<BusinessBrainOrb size={64} />`

4. **Create wizard** (`CreateEmployeeWizard.tsx`): Check if SiriOrb is used there for preview and replace with BusinessBrainOrb as well.

### Notes
- `BusinessBrainOrb` doesn't support custom `colors` or `animationDuration` props — it has a fixed visual style. The per-employee color customization will be removed (the orb will look the same for all employees, matching the Business Brain style).

