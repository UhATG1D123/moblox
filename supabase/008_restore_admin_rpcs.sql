-- Restore compatibility with both deployed admin UIs and user lookup.
-- Safe to re-run after 002_admin_and_views.sql and 003_profiles_social.sql.

create or replace function public.admin_set_status(
  p_target bigint, p_status text, p_hours integer, p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_set_status(
    p_target, p_status, p_hours, p_reason,
    case
      when p_status = 'suspended' then 'Suspension'
      when p_status = 'banned' then 'Community Guidelines'
      when p_status = 'terminated' then 'Terms of Use'
      else null
    end
  );
end
$$;
revoke execute on function public.admin_set_status(bigint, text, integer, text) from public, anon;
grant execute on function public.admin_set_status(bigint, text, integer, text) to authenticated;

create or replace function public.admin_user_detail(p_target bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles;
begin
  if not has_perm('view_admin') then raise exception 'Not allowed'; end if;
  select * into p from profiles where id = p_target;
  if p.id is null then return null; end if;
  return jsonb_build_object(
    'id', p.id, 'username', p.username,
    'display_name', coalesce(p.display_name, p.username),
    'status', p.status, 'status_until', p.status_until,
    'balance', p.balance, 'created_at', p.created_at,
    'role', (select name from roles where id = p.role_id),
    'profile_views', p.profile_views,
    'friend_count', (select count(*) from friendships where user_a = p.id or user_b = p.id),
    'reports_against', (select count(*) from reports where reported_user_id = p.id),
    'badges', coalesce((select jsonb_agg(b.badge) from user_badges b where b.profile_id = p.id), '[]'::jsonb),
    'warnings', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'admin_id', w.admin_id, 'reason', w.reason, 'created_at', w.created_at) order by w.id desc)
      from warnings w where w.profile_id = p.id
    ), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'admin_id', a.admin_id, 'action', a.action, 'target', a.target, 'reason', a.reason, 'created_at', a.created_at) order by a.id desc)
      from (select * from audit_log where target = 'user ' || p.id or target like 'user ' || p.id || ' %' order by id desc limit 25) a
    ), '[]'::jsonb)
  );
end
$$;
revoke execute on function public.admin_user_detail(bigint) from public, anon;
grant execute on function public.admin_user_detail(bigint) to authenticated;
notify pgrst, 'reload schema';
