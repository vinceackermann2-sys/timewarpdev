-- Add explicit deny-all policies so the linter is satisfied while keeping tokens inaccessible to clients

drop policy if exists "Deny select google workspace tokens" on public.google_workspace_tokens;
create policy "Deny select google workspace tokens"
on public.google_workspace_tokens
for select
using (false);

drop policy if exists "Deny insert google workspace tokens" on public.google_workspace_tokens;
create policy "Deny insert google workspace tokens"
on public.google_workspace_tokens
for insert
with check (false);

drop policy if exists "Deny update google workspace tokens" on public.google_workspace_tokens;
create policy "Deny update google workspace tokens"
on public.google_workspace_tokens
for update
using (false)
with check (false);

drop policy if exists "Deny delete google workspace tokens" on public.google_workspace_tokens;
create policy "Deny delete google workspace tokens"
on public.google_workspace_tokens
for delete
using (false);