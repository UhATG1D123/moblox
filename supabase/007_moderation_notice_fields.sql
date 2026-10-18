-- Moblox moderation notice fields: category and moderator note.
-- Apply after the existing moderation migration.
drop function if exists public.admin_set_status(bigint, text, integer, text);

create function public.admin_set_status(
  p_target bigint,
  p_status text,
  p_hours integer,
  p_reason text,
  p_category text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  expires timestamptz;
begin
  if p_status = 'suspended' then
    if not has_perm('suspend_users') then raise exception 'Not allowed'; end if;
  elsif p_status in ('banned', 'active') then
    if not has_perm('ban_users') then raise exception 'Not allowed'; end if;
  elsif p_status = 'terminated' then
    if not has_perm('*') then raise exception 'Owner only'; end if;
  else
    raise exception 'Bad status';
  end if;

  if coalesce(trim(p_reason), '') = '' then raise exception 'Moderator note required'; end if;
  if p_status <> 'active' and coalesce(trim(p_category), '') = '' then raise exception 'Category required'; end if;
  if p_hours is not null and p_hours <= 0 then raise exception 'Hours must be greater than zero'; end if;
  if p_target = 1 then raise exception 'The Moblox owner account is protected'; end if;
  if p_target = me_id() then raise exception 'You cannot change your own status'; end if;

  select r.name into target_role
  from profiles pr join roles r on r.id = pr.role_id
  where pr.id = p_target;
  if target_role is null then raise exception 'User not found'; end if;
  if target_role = 'owner' or (target_role = 'staff' and not has_perm('*')) then
    raise exception 'Not allowed on this account';
  end if;

  expires := case when p_status in ('suspended', 'banned') and p_hours is not null then now() + make_interval(hours => p_hours) else null end;
  update profiles set
    status = p_status,
    status_until = expires,
    status_reason = case when p_status = 'active' then null else left(trim(p_reason), 1000) end,
    status_category = case when p_status = 'active' then null else left(trim(p_category), 120) end,
    status_issued_at = case when p_status = 'active' then null else now() end
  where id = p_target;

  perform log_admin('set_status_' || p_status, 'user ' || p_target, p_reason);
end
$$;

revoke execute on function public.admin_set_status(bigint, text, integer, text, text) from public, anon;
grant execute on function public.admin_set_status(bigint, text, integer, text, text) to authenticated;
notify pgrst, 'reload schema';
