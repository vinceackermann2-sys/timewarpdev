

## Analysis: Extension needs updating

You're right — the webapp is already sending all the correct flags (`targetGroupTab: true`, `focusGroup: false`, `openTab: true`). The problem is on the **extension side**: the extension's content script and background script need to be updated to actually read and respect these flags.

The webapp (this codebase) is doing everything correctly:
- `signalStart` sends `openTab: true`, `focusGroup: false`
- `executeAction` sends `targetGroupTab: true`, `focusGroup: false`
- `getPageContext` sends `targetGroupTab: true`

**The extension code needs to be updated** to:
1. Store the group's tab ID when it creates the tab group
2. On `TIMEWARP_EXECUTE_ACTION` with `targetGroupTab: true` — route the action (especially `navigate`) to the stored group tab ID instead of the active tab
3. On `TIMEWARP_GET_PAGE_CONTEXT` with `targetGroupTab: true` — read context from the group tab, not the active tab
4. On `TIMEWARP_EMPLOYEE_START` with `focusGroup: false` — create the group without calling `chrome.tabs.update(..., { active: true })`

**No changes needed in this Lovable project.** The extension's background script needs the update. This is outside the scope of what can be changed here — you'll need to update your browser extension code to handle these flags.

