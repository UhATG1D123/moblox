-- Fix the named RPC parameters expected by app/admin/page.js.
-- Keep this signature aligned with p_badge, p_granted, p_reason, p_target.

drop function if exists public.admin_set_badge(bigint, text, boolean, text);

create function public.admin_set_badge(
  p_badge text,
  p_granted boolean,
  p_reason text,
  p_target bigint
) returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if p_badge not in ('official_admin', 'verified') then
    raise exception 'Unknown badge';
  end if;

  if p_badge = 'official_admin' then
    if not has_perm('grant_admin_badge') then raise exception 'Not allowed'; end if;
  else
    if not has_perm('grant_verified') then raise exception 'Not allowed'; end if;
  end if;

  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if not exists (select 1 from profiles where id = p_target) then raise exception 'User not found'; end if;

  if coalesce(p_granted, false) then
    insert into user_badges (profile_id, badge, granted_by, reason)
    values (p_target, p_badge, me_id(), left(trim(p_reason), 1000))
    on conflict (profile_id, badge) do update
      set granted_by = excluded.granted_by, reason = excluded.reason, granted_at = now();
  else
    delete from user_badges where profile_id = p_target and badge = p_badge;
  end if;

  perform log_admin(
    (case when coalesce(p_granted, false) then 'grant_badge:' else 'revoke_badge:' end) || p_badge,
    'user ' || p_target,
    p_reason
  );
end
$function$;

revoke execute on function public.admin_set_badge(text, boolean, text, bigint) from public, anon;
grant execute on function public.admin_set_badge(text, boolean, text, bigint) to authenticated;

notify pgrst, 'reload schema';
