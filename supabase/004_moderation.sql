-- Moblox part 4: account restrictions and warning acknowledgment.
-- Run after schema.sql, 002_admin_and_views.sql, and 003_profiles_social.sql.
-- Safe to re-run.

alter table profiles add column if not exists status_reason text;
alter table profiles add column if not exists status_category text;
alter table profiles add column if not exists status_issued_at timestamptz;

alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('active', 'suspended', 'banned', 'terminated'));

alter table warnings add column if not exists acknowledged_at timestamptz;
create index if not exists warnings_unacknowledged_idx
  on warnings (profile_id, id desc) where acknowledged_at is null;

create or replace function has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select ('*' = any(r.permissions)) or (p = any(r.permissions))
    from profiles pr join roles r on r.id = pr.role_id
    where pr.auth_id = auth.uid()
      and (pr.status = 'active' or (pr.status in ('suspended', 'banned') and pr.status_until is not null and pr.status_until <= now()))
  ), false)
$$;

create or replace function my_restriction() returns jsonb
language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  select * into p from profiles where auth_id = auth.uid();
  if p.id is null then return null; end if;

  if p.status in ('suspended', 'banned') and p.status_until is not null and p.status_until <= now() then
    update profiles set status = 'active', status_until = null, status_reason = null, status_category = null, status_issued_at = null where id = p.id;
    return null;
  end if;

  if p.status = 'terminated' then
    return jsonb_build_object(
      'kind', 'terminated', 'reason', p.status_reason, 'category', p.status_category,
      'issued_at', p.status_issued_at, 'expires_at', null, 'server_now', now()
    );
  end if;

  if p.status = 'banned' and (p.status_until is null or p.status_until > now()) then
    return jsonb_build_object(
      'kind', 'banned', 'reason', p.status_reason, 'category', p.status_category,
      'issued_at', p.status_issued_at, 'expires_at', p.status_until, 'server_now', now()
    );
  end if;

  if p.status = 'suspended' and (p.status_until is null or p.status_until > now()) then
    return jsonb_build_object(
      'kind', 'suspended', 'reason', p.status_reason, 'category', p.status_category,
      'issued_at', p.status_issued_at, 'expires_at', p.status_until, 'server_now', now()
    );
  end if;

  return null;
end $$;

create or replace function my_unacknowledged_warnings()
returns table(id bigint, reason text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.id, w.reason, w.created_at
  from warnings w
  where w.profile_id = me_id() and w.acknowledged_at is null
  order by w.id desc
$$;

create or replace function acknowledge_warning(p_warning bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if me_id() is null then raise exception 'Not signed in'; end if;
  update warnings set acknowledged_at = now()
    where id = p_warning and profile_id = me_id() and acknowledged_at is null;
  if not found then
    if not exists (select 1 from warnings where id = p_warning and profile_id = me_id() and acknowledged_at is not null) then
      raise exception 'Warning not found';
    end if;
  end if;
end $$;

create or replace function admin_set_status(p_target bigint, p_status text, p_hours integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare target_role text; expires timestamptz;
begin
  if p_status = 'suspended' then
    if not has_perm('suspend_users') then raise exception 'Not allowed'; end if;
  elsif p_status = 'banned' or p_status = 'active' then
    if not has_perm('ban_users') then raise exception 'Not allowed'; end if;
  elsif p_status = 'terminated' then
    if not has_perm('*') then raise exception 'Owner only'; end if;
  else
    raise exception 'Bad status';
  end if;

  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if p_hours is not null and p_hours <= 0 then raise exception 'Hours must be greater than zero'; end if;
  if p_target = 1 then raise exception 'The Moblox owner account is protected'; end if;
  if p_target = me_id() then raise exception 'You cannot change your own status'; end if;

  select r.name into target_role from profiles pr join roles r on r.id = pr.role_id where pr.id = p_target;
  if target_role is null then raise exception 'User not found'; end if;
  if target_role = 'owner' or (target_role = 'staff' and not has_perm('*')) then
    raise exception 'Not allowed on this account';
  end if;

  expires := case when p_status in ('suspended', 'banned') and p_hours is not null then now() + make_interval(hours => p_hours) else null end;
  update profiles set
    status = p_status,
    status_until = expires,
    status_reason = case when p_status = 'active' then null else left(trim(p_reason), 1000) end,
    status_category = case when p_status = 'active' then null else p_status end,
    status_issued_at = case when p_status = 'active' then null else now() end
  where id = p_target;

  perform log_admin('set_status_' || p_status, 'user ' || p_target, p_reason);
end $$;

revoke execute on function my_restriction() from public, anon;
grant execute on function my_restriction() to authenticated;
revoke execute on function my_unacknowledged_warnings() from public, anon;
grant execute on function my_unacknowledged_warnings() to authenticated;
revoke execute on function acknowledge_warning(bigint) from public, anon;
grant execute on function acknowledge_warning(bigint) to authenticated;
revoke execute on function admin_set_status(bigint, text, integer, text) from public, anon;
grant execute on function admin_set_status(bigint, text, integer, text) to authenticated;


-- Keep direct purchase RPC calls consistent with the restriction middleware.
create or replace function purchase_item(p_item_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; it items;
begin
  select * into me from profiles where auth_id = auth.uid() for update;
  if me.id is null then raise exception 'Not signed in'; end if;
  if me.status in ('suspended', 'banned') and me.status_until is not null and me.status_until <= now() then
    update profiles set status = 'active', status_until = null, status_reason = null, status_category = null, status_issued_at = null where id = me.id;
    me.status := 'active';
  end if;
  if me.status in ('banned', 'terminated') or (me.status = 'suspended' and (me.status_until is null or me.status_until > now())) then
    raise exception 'Account restricted';
  end if;
  select * into it from items where id = p_item_id and published;
  if it.id is null then raise exception 'Item unavailable'; end if;
  if exists (select 1 from inventory where profile_id = me.id and item_id = it.id) then raise exception 'Already owned'; end if;
  if me.balance < it.price then raise exception 'Insufficient balance'; end if;
  update profiles set balance = balance - it.price where id = me.id;
  insert into inventory (profile_id, item_id) values (me.id, it.id);
  insert into ledger (profile_id, amount, kind, item_id) values (me.id, -it.price, 'purchase', it.id);
end $$;
