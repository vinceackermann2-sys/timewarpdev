-- Google Workspace connection metadata (safe for client reads)
create table if not exists public.google_workspace_connections (
  user_id uuid primary key,
  connected boolean not null default false,
  scopes text,
  last_connected_at timestamptz,
  oauth_state text,
  oauth_state_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- OAuth tokens (server-side only; no client SELECT policies)
create table if not exists public.google_workspace_tokens (
  user_id uuid primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.google_workspace_connections enable row level security;
alter table public.google_workspace_tokens enable row level security;

-- Updated-at trigger helper
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_google_workspace_connections_updated_at on public.google_workspace_connections;
create trigger set_google_workspace_connections_updated_at
before update on public.google_workspace_connections
for each row execute function public.update_updated_at_column();

drop trigger if exists set_google_workspace_tokens_updated_at on public.google_workspace_tokens;
create trigger set_google_workspace_tokens_updated_at
before update on public.google_workspace_tokens
for each row execute function public.update_updated_at_column();

-- Policies: users can read their connection status (but not tokens)

drop policy if exists "Users can view their own workspace connection" on public.google_workspace_connections;
create policy "Users can view their own workspace connection"
on public.google_workspace_connections
for select
using (auth.uid() = user_id);

drop policy if exists "Users can upsert their own workspace connection" on public.google_workspace_connections;
create policy "Users can upsert their own workspace connection"
on public.google_workspace_connections
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workspace connection" on public.google_workspace_connections;
create policy "Users can update their own workspace connection"
on public.google_workspace_connections
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- NOTE: No SELECT/INSERT/UPDATE/DELETE policies for google_workspace_tokens.
-- With RLS enabled, clients cannot access tokens. Backend functions will use a service role key to bypass RLS.