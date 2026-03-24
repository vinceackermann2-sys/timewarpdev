

## Plan: Workspace auto-rename on onboarding + land on brand detail view

### What needs to happen

1. **Workspace renamed to business name during onboarding Step 2** — After the brand is created (~line 280 in `BusinessDNAOnboarding.tsx`), read `preferred_workspace_id` from localStorage and update the workspace name to the brand name.

2. **Invalidate workspace query after onboarding completes** — In `Database.tsx`, import `useQueryClient` and call `queryClient.invalidateQueries({ queryKey: ["workspaces"] })` inside the `onComplete` callback (~line 175) so the sidebar immediately shows the new workspace name.

3. **Landing view already correct** — The existing `onComplete` already sets `activeBrandId` + `showBusinessDNA = true`, which renders `BusinessDNAView` (brand/audience/product detail tabs), not the business list. No change needed here.

### File changes

#### `src/components/database/BusinessDNAOnboarding.tsx`
After `setBrands(prev => [...prev, newBrand])` (line 280), add:
```typescript
const workspaceId = localStorage.getItem("preferred_workspace_id");
if (workspaceId) {
  supabase.from("workspaces").update({ name: brandName }).eq("id", workspaceId);
}
```

#### `src/pages/Database.tsx`
- Import `useQueryClient` from `@tanstack/react-query`
- Get `queryClient` via `useQueryClient()` inside the component
- In the `onComplete` callback (line 175-184), add `queryClient.invalidateQueries({ queryKey: ["workspaces"] })` after setting the brand/view state

### Summary
- 2 files, ~6 lines added total
- Workspace auto-renames to the business name extracted during scraping
- Sidebar reflects the change immediately via cache invalidation
- User lands on brand detail view (already working)

