

## Problem

The `accept_workspace_invitation` database function updates the invitation's status from `'pending'` to `'accepted'`, but the table has a unique constraint on `(workspace_id, email, status)`. If the user was previously invited and accepted (an old `'accepted'` row exists), a second invite+accept cycle hits the constraint because there would be two rows with `(workspace_id, email, 'accepted')`.

## Fix

**Database migration** — modify the `accept_workspace_invitation` function to delete any prior accepted/expired invitations for the same `(workspace_id, email)` before updating the current one to `'accepted'`. This is a single-line addition before the `UPDATE` statement:

```sql
DELETE FROM public.workspace_invitations
WHERE workspace_id = inv.workspace_id
  AND lower(email) = lower(inv.email)
  AND id != inv.id;
```

This clears stale invitation rows (accepted, expired, or duplicate pending) so the status update never conflicts with the unique constraint. No schema change needed — just the function body update via migration.

**Files changed:**
- New database migration (alter `accept_workspace_invitation` function)

