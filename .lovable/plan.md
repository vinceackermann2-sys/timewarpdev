
Objective
- Make workspace invites reliably send a true workspace invitation email/link (not generic login behavior) and eliminate duplicate-key failures that surface as “Invitation Failed”.

Findings from current code/logs
1) Existing-user invite path sends OTP/magic link
- `supabase/functions/send-workspace-invite/index.ts` uses:
  - existing users: `auth.signInWithOtp({ emailRedirectTo: inviteUrl, shouldCreateUser:false })`
  - new users: `admin.inviteUserByEmail(...)`
- This causes auth hook events with `action_type: "magiclink"` and currently still renders login-style behavior in some cases.

2) Invite-template remap condition is too narrow
- `supabase/functions/auth-email-hook/index.ts` remaps only when:
  - `rawEmailType === "magiclink"` and `payload.data.url.includes('/invite?token=')`
- In real auth links, invite target is often in encoded `redirect_to` query param, so this check fails; logs show `emailType: "magiclink"`.

3) Duplicate invitation insert is not race-safe
- `send-workspace-invite` does read-then-insert for pending invites.
- Under concurrent invite attempts, second insert can hit unique constraint:
  - `workspace_invitations_workspace_id_email_status_key`
- That bubbles to UI as failed invite.

Implementation plan
1) Harden workspace-invite URL extraction/remap in auth email hook
- File: `supabase/functions/auth-email-hook/index.ts`
- Add helper logic to parse `payload.data.url`:
  - Parse URL safely
  - Read/decode `redirect_to` param (if present)
  - Determine effective workspace-invite URL if either:
    - direct URL contains `/invite?token=`
    - decoded `redirect_to` contains `/invite?token=`
- Set:
  - `emailType = 'invite'` when workspace-invite target is detected (even if `rawEmailType` is magiclink/recovery style)
  - `templateProps.confirmationUrl` to the workspace invite URL (decoded redirect target), not the raw verify URL
- Result: email button always opens workspace invite acceptance flow.

2) Make invite creation idempotent under concurrency
- File: `supabase/functions/send-workspace-invite/index.ts`
- Replace fragile read-then-insert behavior with race-safe handling:
  - Preferred: `upsert` on `(workspace_id,email,status)` with `status:'pending'`, then select row
  - Or keep insert, but on error code `23505`, fetch existing pending row and return success payload
- Preserve existing response shape (`success`, `alreadyInvited`, `inviteUrl`, `invitation`).
- Ensure duplicate-key conflict never returns 500 for valid re-invite attempts.

3) Keep consistent email behavior for both new + existing users
- In `send-workspace-invite`, keep current split if needed, but enforce that generated email always resolves to workspace invite:
  - Existing user path can remain OTP-based only if hook remap + confirmation URL rewrite is in place.
  - New user path continues invite flow.
- Ensure pending re-invites re-send with same token and same workspace invite URL.

4) Improve failure semantics returned to client
- File: `supabase/functions/send-workspace-invite/index.ts`
- Return clear, non-fatal success for duplicate pending invite cases.
- Reserve error responses for actual blockers (unauthorized/forbidden/invalid payload/already member).

5) Frontend robustness for invite feedback
- File: `src/hooks/useWorkspace.ts` (and optionally `WorkspaceDialog.tsx`)
- Keep current error plumbing, but map known benign “already invited / duplicate pending” backend outcomes to success toast text.
- Avoid showing destructive “Failed to send invite” for idempotent retries.

Validation plan (end-to-end)
1) Owner invites brand-new email:
- Receives branded Invite email
- CTA opens `/invite?token=...` flow and acceptance succeeds.

2) Owner invites existing account email:
- Receives branded Invite email (not login wording)
- CTA resolves to workspace invitation acceptance route.

3) Re-invite same pending email (single and rapid double-click):
- No duplicate-key error
- Returns success with same token/invite URL
- UI shows success (or “already invited, resent”).

4) Accept invite while signed out:
- Auth step occurs, then lands back in workspace invite acceptance route.

Technical notes
- No database schema migration required for this fix; this is logic-level in edge functions/client handling.
- Existing secrets are already present (`LOVABLE_API_KEY`, service keys), so no secret setup is needed.
- After implementation, redeploy:
  - `send-workspace-invite`
  - `auth-email-hook`
