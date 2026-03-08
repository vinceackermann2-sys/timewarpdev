

## Fix: Skeleton not showing when switching to Business DNA view

### Root Cause
In `MyBusinessesView`, the `useEffect` on line 47 has an early exit when `activeWorkspaceId` is `null`:
```js
if (!activeWorkspaceId) { setWsBusinesses([]); setLoadingBiz(false); return; }
```

When the component first mounts, `activeWorkspaceId` may briefly be `null` (while `useWorkspace` resolves from localStorage). This immediately sets `loadingBiz = false`, hiding the skeleton. When `activeWorkspaceId` then becomes available on the next render cycle, there's a brief gap where neither skeletons nor businesses show — the user sees an empty state before data loads.

### Fix
1. **Keep `loadingBiz` true when workspace is still resolving** — don't set it to `false` when `activeWorkspaceId` is null. Only set it to false after a successful fetch or a confirmed empty state.

2. **In the useEffect early exit**: Change the `!activeWorkspaceId` branch to keep `loadingBiz` as `true` (or only set it false if `wsLoading` is also false, meaning workspaces have finished loading and there truly is no workspace).

### Changes
**File: `src/components/database/MyBusinessesView.tsx`**

Update the useEffect (line 46-80):
- When `!activeWorkspaceId`: only set `loadingBiz(false)` if workspace loading is also complete (`!wsLoading`), otherwise keep it `true` so skeletons remain visible while the workspace ID is being determined.
- Simplify the `isNewWorkspace` logic — always set `loadingBiz(true)` at the start of `load()` regardless.

```tsx
useEffect(() => {
  if (!activeWorkspaceId) {
    setWsBusinesses([]);
    // Only stop loading if workspaces have finished loading (no workspace exists)
    if (!wsLoading) setLoadingBiz(false);
    return;
  }

  // Clear stale data and show skeletons
  setWsBusinesses([]);
  setLoadingBiz(true);
  prevWorkspaceId.current = activeWorkspaceId;

  let cancelled = false;
  async function load() {
    const { data, error } = await supabase
      .from("user_business_data")
      .select("id, content, user_id")
      .eq("workspace_id", activeWorkspaceId!)
      .eq("data_type", "brand")
      .eq("source", "business-dna");

    if (cancelled) return;
    if (!error && data) {
      const parsed = data.map((row) => {
        try {
          return { ...JSON.parse(row.content || "{}"), _rowId: row.id, _ownerId: row.user_id };
        } catch { return null; }
      }).filter(Boolean);
      lastKnownCount.current = parsed.length;
      setWsBusinesses(parsed);
    }
    setLoadingBiz(false);
  }
  load();
  return () => { cancelled = true; };
}, [activeWorkspaceId, brands, wsLoading]);
```

Key differences:
- Added `wsLoading` to the dependency array and to the null-workspace guard
- Removed the `isNewWorkspace` branching — always clear and reload when the effect runs with a valid workspace ID
- Skeletons now reliably show during the entire loading window

