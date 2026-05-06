Root cause found:

1. Computer mode is getting a false “extension connected” state.
   The app currently accepts its own outbound ping object (`source: "timewarp-app"`) as proof that the extension is connected. That means Computer mode can turn on even when no real extension pong/group-ready/action-result came back.

2. The app can continue after the extension fails to open a tab.
   In the generic browser-agent path, `signalStart(...)` is called but its `false` result is ignored, so the UI starts showing AI-generated browser steps even when the extension never created a real tab.

3. Empty page context is treated as usable context.
   `getPageContext()` resolves to `{}` after timeout. `{}` is truthy, so the backend enters browser mode anyway and asks the model for browser actions, which looks like fake progress.

4. The extension package has several issues:
   - `TIMEWARP_OPEN_GROUP_TAB` is sent by the app but not handled by the extension.
   - Direct browser actions use CDP commands but the bridge execution path does not attach the debugger first, so real click/type actions can fail.
   - The content script currently runs on all pages and forwards `window.postMessage` commands. That is too broad unless guarded by trusted TimeWarp origins.
   - The side panel only supports email/password login and still references old branding/URLs.

Plan to fix it:

1. Fix the app-side bridge so Computer mode cannot fake execution
   - In `useExtensionBridge.ts`, remove the overly broad “source contains timewarp” connection rule.
   - Only mark the extension connected when receiving a real extension response: `TIMEWARP_PONG`, `TIMEWARP_EXTENSION_READY`, `TIMEWARP_PAGE_CONTEXT`, `TIMEWARP_ACTION_RESULT`, or `TIMEWARP_GROUP_READY`.
   - Add a strict timeout result for page context/action execution instead of returning plain `{}`.
   - Make `signalStart()` resolve `true` only if the extension reports a successful group/tab creation.

2. Stop browser runs immediately when no real tab/session exists
   - In `runAgentChatWithBrowser`, check the return value from `signalStart(...)` and stop with a clear message if no tab was opened.
   - In `runComputerMode`, keep the existing hard stop, but also reject empty/timeout page context.
   - Treat any “Timeout waiting for extension…” result as a disconnected-extension failure.
   - Require at least one successful real browser action before showing a task summary as completed.

3. Tighten browser-action prompting and validation
   - Update the browser action prompt so `click`, `type`, and `extract` must include a concrete selector from the visible page context.
   - Make invalid action payloads return a correction request instead of appearing as a completed step.
   - Prevent `respond`/`done` from being used as fake “browser progress” unless the task is genuinely blocked or finished.

4. Rebuild the Chrome extension safely
   - Update manifest version to the next patch version, `1.0.4`.
   - Update extension name/description/side panel copy to the current TimeWarp branding.
   - Replace old links like `digital-guide-genie.lovable.app` with the current TimeWarp domain.
   - Refresh icon usage to the current TimeWarp swirl/brand assets.
   - Keep Manifest V3.

5. Fix extension tab opening and action execution
   - Add handling for `TIMEWARP_OPEN_GROUP_TAB` in both `content.js` and `background.js`.
   - Make tab creation idempotent so `TIMEWARP_EMPLOYEE_START` and `TIMEWARP_OPEN_GROUP_TAB` cannot accidentally open duplicate tabs.
   - Attach the Chrome debugger before CDP click/type/key actions and detach safely afterward.
   - Keep navigate actions using `chrome.tabs.update` without CDP.
   - Return explicit structured errors when a tab cannot be created, the debugger cannot attach, or a selector is missing.

6. Make the extension safer
   - Add a trusted-origin allowlist for app bridge messages:
     - `https://timewarpdev.com`
     - `https://timewarpdev.lovable.app`
     - relevant Lovable preview origins
   - In `content.js`, ignore `window.postMessage` control commands from non-TimeWarp origins.
   - In `background.js`, verify forwarded bridge requests came from a trusted TimeWarp origin before opening tabs or executing actions.
   - Keep sensitive operations guarded: no passwords, no payments, no account creation, manual takeover for login/payment pages.
   - Review permissions and keep only what is required for Computer mode: tabs/tabGroups/scripting/storage/sidePanel/debugger/windows plus host access needed for user-requested browsing.

7. Add Google sign-in support for the extension
   - Add a “Continue with Google” button to the extension side panel.
   - Use a safe extension-auth bridge instead of embedding Google client secrets in the extension.
   - Flow:
     1. Extension opens the TimeWarp login page with a one-time nonce.
     2. User signs in with Google using the existing TimeWarp auth flow.
     3. The app sends the authenticated session back only to the extension request with the matching nonce and only on trusted TimeWarp origins.
     4. Extension stores the session in `chrome.storage.local` and shows the signed-in state.
   - Keep email/password login as a fallback.

8. Package and verify
   - Repackage as `timewarp-fixed-v104.zip`.
   - Inspect the generated manifest and scripts before delivery.
   - Confirm the package includes the new branding, Google login UI, trusted-origin checks, and the tab/action fixes.
   - Provide install/reload instructions: remove or reload the old unpacked extension in Chrome, then load the new unzipped `v104` folder.

Expected result after implementation:

- If the extension is not truly connected, Computer mode will say so instead of generating fake steps.
- If tab creation fails, the chat will stop with a clear error.
- If Computer mode starts, a real browser tab/group must exist before any steps are shown.
- Click/type/navigation actions should execute against the real group tab.
- Extension messaging will be safer and limited to trusted TimeWarp origins.
- The extension will show updated TimeWarp branding and support Google sign-in through the existing app auth flow.

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>