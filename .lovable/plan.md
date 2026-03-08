

## Fix: Full SOP execution, no random Google tab, proper tab group signaling

### Problems
1. **Stale closure bug** — The `isPaused` / `isManualMode` checks on lines 198-199 read React state inside an async loop, but closures capture the initial value. The loop may hang or skip pause checks because it never sees updated state. Must use refs.
2. **Random Google tab** — `signalStart` fires immediately, and the extension likely opens a default `google.com` tab. Fix: add `openTab: false` to the start message so the extension only creates the tab group without opening a tab. The AI's first `navigate` action will open the correct URL inside the group.
3. **Tab group not created** — The extension needs to know the employee name for the group label, and needs to confirm the group is ready before actions start. Fix: add `groupName` to the start signal, and make `signalStart` return a promise that resolves on a `TIMEWARP_GROUP_READY` response from the extension (with a timeout fallback).

### Changes

**`src/hooks/useExtensionBridge.ts`**
- Change `signalStart` to accept `{ employeeId, employeeName }`, send `{ type: "TIMEWARP_EMPLOYEE_START", employeeId, employeeName, useTabGroup: true, openTab: false }`, and return a `Promise` that resolves when `TIMEWARP_GROUP_READY` is received (3s timeout fallback).
- Add listener for `TIMEWARP_GROUP_READY` message type.

**`src/components/database/EmployeeDetailView.tsx`**
- Convert `isPaused` and `isManualMode` to use refs (`isPausedRef`, `isManualModeRef`) alongside state, so the async loop always reads current values.
- Update `handleRun`:
  - `await signalStart(...)` — wait for group to be ready before entering the loop.
  - Pass `employee.name` to signalStart for the group label.
  - Use refs for pause/manual checks inside the loop.
- Increase `MAX_STEPS` to 50 to give longer SOPs room to complete.

