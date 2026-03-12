## Plan: Fix 7 Issues

### 1. Research/Generation Chat — suggestions not visible & incongruent answers

**Problem**: The `[SUGGEST:...]` tag parsing works, but suggestions may not render in the floating chat on the AiCeoChatView page because that chat doesn't use the whiteboard chat nodes — it uses `FloatingChat` which just sends messages to `AiCeoChatView.handleActionSend`. The whiteboard `ResearchChatNode` and `ActionChatNode` DO parse and render suggestions correctly. The "incongruent answers" likely stems from the FloatingChat on the homepage not having any response display at all — it sends a message but there's no chat history UI.

**Fix**: This is actually the AiCeo landing page chat — it currently only sends tasks to a Replit server for browser automation, not to the research/action chat functions. The floating chat on `AiCeoChatView` needs no fix since users reach the real chat via `/app` (whiteboard). The whiteboard nodes already work correctly for suggestions. **No code change needed** unless the user means the whiteboard chat suggestions aren't showing — in which case I'll verify the `extractSuggestions` regex handles the AI's actual output format and ensure the `SuggestedActions` component is always scrolled into view.

**Actually**: Looking more carefully, the suggestions ARE rendered in both `ResearchChatNode` and `ActionChatNode` (lines 484-501 and 547-564). The issue may be that the AI doesn't consistently emit `[SUGGEST:...]` tags. I'll update both system prompts to be more forceful about emitting the tag, and also improve the `parseSuggestions` regex to handle more edge cases (e.g., suggestions on a new line, trailing whitespace).

**Files**: `supabase/functions/research-chat/index.ts`, `supabase/functions/action-chat/index.ts`, `src/lib/parseSuggestions.ts`

### 2. Employee Wizard — Remove Title, Scope, Definitions steps; add context dropdown to Procedure

**Problem**: Steps 2 (Title & Purpose), 3 (Scope), and 4 (Definitions) add friction.

**Fix**: 

- Remove steps "Title & Purpose", "Scope", and "Definitions" from the wizard
- Merge SOP title into step 0 (Identity) or auto-generate from role
- Update `STEPS` array: `["Identity", "Import SOP", "Procedure", "Safety", "Business Data"]`
- In Procedure step, add a collapsible context area per step (a dropdown/accordion below each step input to add additional notes/context)
- Update step indices and `handleSave` to skip removed fields

**File**: `src/components/database/CreateEmployeeWizard.tsx`

### 3. Reduce grain/noise on hero desktop

**Problem**: Two SVG grain layers on desktop (lines 262-273) with high opacity (0.85 and 0.42), plus a canvas tile at 0.35.

**Fix**: Reduce desktop SVG grain opacity from 0.85→0.45 and 0.42→0.22. Reduce canvas tile opacity from 0.35→0.25 on desktop.

**File**: `src/components/aiceo/HeroSection.tsx`

### 4. Microsoft OAuth redirect — should return to where user was

**Problem**: `ConnectorGrid` doesn't pass `returnPath` when calling `connect-provider`. The `microsoft-oauth-callback` redirects to `returnPath` from state, but `ConnectorGrid.handleConnect` doesn't include it. Also, `ConnectorGrid` hardcodes `navigate("/app")` on success.

**Fix**: 

- In `ConnectorGrid.handleConnect`, pass `returnPath: window.location.pathname` in the request body
- In `ConnectorGrid` OAuth return handler, remove the hardcoded `navigate("/app")` — just stay on current page
- The `connect-provider` already reads `body.returnPath` and encodes it in state, and `microsoft-oauth-callback` already redirects to `returnPath`. Just need to pass it from the frontend.

**Files**: `src/components/aiceo/ConnectorGrid.tsx`

### 5. Microsoft connect — choose what data and how much

**Problem**: The `ConnectorGrid` (onboarding flow) connects Microsoft but doesn't show the sync preferences dialog.

**Fix**: After successful Microsoft OAuth return in `ConnectorGrid`, show the `SyncPreferencesDialog` so users can choose categories and limits before syncing. Import and integrate the existing dialog component.

**File**: `src/components/aiceo/ConnectorGrid.tsx`

### 6. Deploy browser extension agent

**Problem**: User wants to deploy a new edge function for the extension agent to seperate the browser-agent and extension-agent. The `browser-agent` function already exists.

**Fix**: Add extension-agent and deploy it.

### 7. Each AI call in browser-agent should consume one action

**Problem**: The `browser-agent` and extension-agent edge function does NOT call `increment_actions_used` — unlike `research-chat` and `action-chat` which do.

**Fix**: Add the same `increment_actions_used` RPC call to `browser-agent/index.ts`, checking the result and returning 403 if limit reached.

**File**: `supabase/functions/browser-agent/index.ts`

---

### Summary of files to modify:

1. `supabase/functions/research-chat/index.ts` — Strengthen suggestion prompt
2. `supabase/functions/action-chat/index.ts` — Strengthen suggestion prompt
3. `src/lib/parseSuggestions.ts` — Improve regex robustness
4. `src/components/database/CreateEmployeeWizard.tsx` — Remove 3 steps, add context dropdowns to procedure
5. `src/components/aiceo/HeroSection.tsx` — Reduce grain opacity
6. `src/components/aiceo/ConnectorGrid.tsx` — Fix redirect, add sync prefs dialog
7. `supabase/functions/browser-agent/index.ts` — Add action consumption
8. `supabase/config.toml` — Add browser-agent entry
9. Deploy `browser-agent` edge function