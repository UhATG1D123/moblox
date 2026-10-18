-- Moblox part 2. Paste into Supabase > SQL Editor > Run (once, after schema.sql).

create or replace function me_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from profiles where auth_id = auth.uid()
$$;

create or replace function has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select ('*' = any(r.permissions)) or (p = any(r.permissions))
    from profiles pr join roles r on r.id = pr.role_id
    where pr.auth_id = auth.uid() and pr.status = 'active'
  ), false)
$$;

-- Read access
create policy "roles readable" on roles for select using (true);
create policy "staff read profiles" on profiles for select using (has_perm('view_admin'));
create policy "staff read items" on items for select using (has_perm('edit_catalog'));
create policy "staff read ledger" on ledger for select using (has_perm('view_admin'));
create policy "staff read warnings" on warnings for select using (has_perm('view_admin'));
create policy "staff read reports" on reports for select using (has_perm('review_reports'));
create policy "staff read audit" on audit_log for select using (has_perm('view_admin'));

-- Public profile data (no balances, no emails)
create or replace view public_profiles as
  select id, username, created_at, (status = 'banned') as banned from profiles;
create or replace view public_inventory as
  select inv.profile_id, i.id as item_id, i.name, i.category, i.price, inv.acquired_at
  from inventory inv join items i on i.id = inv.item_id;
grant select on public_profiles, public_inventory to anon, authenticated;

-- Purchase now also respects timed suspensions
create or replace function purchase_item(p_item_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; it items;
begin
  select * into me from profiles where auth_id = auth.uid() for update;
  if me.id is null then raise exception 'Not signed in'; end if;
  if me.status = 'banned' or (me.status = 'suspended' and (me.status_until is null or me.status_until > now())) then
    raise exception 'Account restricted'; end if;
  select * into it from items where id = p_item_id and published;
  if it.id is null then raise exception 'Item unavailable'; end if;
  if exists (select 1 from inventory where profile_id = me.id and item_id = it.id) then
    raise exception 'Already owned'; end if;
  if me.balance < it.price then raise exception 'Insufficient balance'; end if;
  update profiles set balance = balance - it.price where id = me.id;
  insert into inventory (profile_id, item_id) values (me.id, it.id);
  insert into ledger (profile_id, amount, kind, item_id) values (me.id, -it.price, 'purchase', it.id);
end $$;

create or replace function log_admin(p_action text, p_target text, p_reason text) returns void
language sql security definer set search_path = public as $$
  insert into audit_log (admin_id, action, target, reason) values (me_id(), p_action, p_target, p_reason)
$$;
revoke execute on function log_admin(text,text,text) from public, anon, authenticated;

create or replace function admin_adjust_currency(p_target bigint, p_amount integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('adjust_currency') then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if p_amount = 0 then raise exception 'Amount cannot be zero'; end if;
  update profiles set balance = balance + p_amount where id = p_target;
  if not found then raise exception 'User not found'; end if;
  insert into ledger (profile_id, amount, kind, reason, actor_id) values (p_target, p_amount, 'admin_adjust', p_reason, me_id());
  perform log_admin('adjust_currency', 'user ' || p_target || ' by ' || p_amount, p_reason);
end $$;

create or replace function admin_warn(p_target bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('warn_users') then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if not exists (select 1 from profiles where id = p_target) then raise exception 'User not found'; end if;
  insert into warnings (profile_id, admin_id, reason) values (p_target, me_id(), p_reason);
  perform log_admin('warn', 'user ' || p_target, p_reason);
end $$;

create or replace function admin_set_status(p_target bigint, p_status text, p_hours integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare trole text;
begin
  if p_status = 'suspended' then
    if not has_perm('suspend_users') then raise exception 'Not allowed'; end if;
  elsif p_status in ('banned', 'active') then
    if not has_perm('ban_users') then raise exception 'Not allowed'; end if;
  else raise exception 'Bad status'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if p_target = 1 then raise exception 'The Moblox owner account is protected'; end if;
  if p_target = me_id() then raise exception 'You cannot change your own status'; end if;
  select r.name into trole from profiles pr join roles r on r.id = pr.role_id where pr.id = p_target;
  if trole is null then raise exception 'User not found'; end if;
  if trole = 'owner' or (trole = 'staff' and not has_perm('*')) then raise exception 'Not allowed on this account'; end if;
  update profiles set status = p_status,
    status_until = case when p_status = 'suspended' and p_hours is not null then now() + make_interval(hours => p_hours) else null end
  where id = p_target;
  perform log_admin('set_status_' || p_status, 'user ' || p_target, p_reason);
end $$;

create or replace function admin_save_item(p_name text, p_description text, p_category text, p_price integer, p_published boolean) returns bigint
language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not has_perm('edit_catalog') then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name required'; end if;
  if p_price is null or p_price < 0 then raise exception 'Bad price'; end if;
  insert into items (name, description, category, price, published, creator_id)
    values (trim(p_name), coalesce(p_description, ''), p_category, p_price, coalesce(p_published, true), me_id())
    returning id into new_id;
  perform log_admin('create_item', 'item ' || new_id, p_name);
  return new_id;
end $$;

create or replace function admin_set_published(p_item bigint, p_published boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('edit_catalog') then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  update items set published = p_published where id = p_item;
  if not found then raise exception 'Item not found'; end if;
  perform log_admin(case when p_published then 'publish_item' else 'unpublish_item' end, 'item ' || p_item, p_reason);
end $$;

create or replace function admin_set_role(p_target bigint, p_role_id integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('*') then raise exception 'Owner only'; end if;
  if p_target = 1 then raise exception 'The Moblox owner account is protected'; end if;
  if p_role_id not in (2, 3) then raise exception 'Bad role'; end if;
  update profiles set role_id = p_role_id where id = p_target;
  if not found then raise exception 'User not found'; end if;
  perform log_admin('set_role', 'user ' || p_target || ' role ' || p_role_id, null);
end $$;

create or replace function report_item(p_item bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if me_id() is null then raise exception 'Not signed in'; end if;
  if length(coalesce(trim(p_reason), '')) < 3 then raise exception 'Please explain the problem'; end if;
  if not exists (select 1 from items where id = p_item) then raise exception 'Item not found'; end if;
  insert into reports (reporter_id, item_id, reason) values (me_id(), p_item, left(trim(p_reason), 500));
end $$;

create or replace function admin_resolve_report(p_report bigint, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('review_reports') then raise exception 'Not allowed'; end if;
  if p_status not in ('actioned', 'dismissed') then raise exception 'Bad status'; end if;
  update reports set status = p_status where id = p_report;
  if not found then raise exception 'Report not found'; end if;
  perform log_admin('report_' || p_status, 'report ' || p_report, p_reason);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_adjust_currency(bigint,integer,text)','admin_warn(bigint,text)',
    'admin_set_status(bigint,text,integer,text)','admin_save_item(text,text,text,integer,boolean)',
    'admin_set_published(bigint,boolean,text)','admin_set_role(bigint,integer)',
    'report_item(bigint,text)','admin_resolve_report(bigint,text,text)','purchase_item(bigint)']
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
