create or replace function public.get_workspace_members(_workspace_id uuid)
 returns table(id uuid, user_id uuid, role workspace_role, joined_at timestamp with time zone, email text)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  if not public.is_workspace_member(auth.uid(), _workspace_id) then
    return;
  end if;

  return query
  select
    wm.id::uuid,
    wm.user_id::uuid,
    wm.role::workspace_role,
    wm.joined_at::timestamp with time zone,
    coalesce(au.email::text, 'unknown'::text) as email
  from public.workspace_members wm
  left join auth.users au on au.id = wm.user_id
  where wm.workspace_id = _workspace_id;
end;
$function$;