-- Moblox part 3: profiles, friends, blocks, notifications, badges, user reports.
-- Paste into Supabase > SQL Editor > Run. Safe to run more than once.

alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists privacy jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists last_seen timestamptz;
alter table profiles add column if not exists profile_views integer not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_len') then
    alter table profiles add constraint profiles_display_name_len check (display_name is null or char_length(display_name) between 1 and 30);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_len') then
    alter table profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 500);
  end if;
end $$;

create table if not exists user_badges (
  profile_id bigint not null references profiles(id) on delete cascade,
  badge text not null check (badge in ('official_admin', 'verified')),
  granted_by bigint references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (profile_id, badge)
);
create table if not exists friendships (
  user_a bigint not null references profiles(id) on delete cascade,
  user_b bigint not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create table if not exists friend_requests (
  id bigint generated always as identity primary key,
  sender_id bigint not null references profiles(id) on delete cascade,
  receiver_id bigint not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);
create table if not exists blocks (
  blocker_id bigint not null references profiles(id) on delete cascade,
  blocked_id bigint not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists notifications (
  id bigint generated always as identity primary key,
  profile_id bigint not null references profiles(id) on delete cascade,
  kind text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_profile_idx on notifications (profile_id, id desc);

alter table reports alter column item_id drop not null;
alter table reports add column if not exists reported_user_id bigint references profiles(id) on delete set null;

alter table user_badges enable row level security;
alter table friendships enable row level security;
alter table friend_requests enable row level security;
alter table blocks enable row level security;
alter table notifications enable row level security;

drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications for select using (profile_id = me_id());

create or replace function are_friends(a bigint, b bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where user_a = least(a, b) and user_b = greatest(a, b))
$$;

create or replace function privacy_allows(p_id bigint, p_key text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v bigint := me_id(); setting text;
begin
  if v is not null and v = p_id then return true; end if;
  if has_perm('view_admin') then return true; end if;
  select coalesce(privacy ->> p_key, 'everyone') into setting from profiles where id = p_id;
  if setting is null then return false; end if;
  if setting = 'everyone' then return true; end if;
  if setting = 'friends' then return v is not null and are_friends(v, p_id); end if;
  return false;
end $$;

create or replace function notify_user(p_to bigint, p_kind text, p_body text, p_link text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (profile_id, kind, body, link) values (p_to, p_kind, p_body, p_link)
$$;
revoke execute on function notify_user(bigint, text, text, text) from public, anon, authenticated;

create or replace function get_public_profile(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles; v bigint := me_id(); rel text := 'none'; req bigint;
begin
  select * into p from profiles where id = p_id;
  if p.id is null then return null; end if;
  if v is not null then
    if v = p_id then rel := 'self';
    elsif exists (select 1 from blocks where blocker_id = v and blocked_id = p_id) then rel := 'blocked';
    elsif are_friends(v, p_id) then rel := 'friends';
    else
      select id into req from friend_requests where sender_id = v and receiver_id = p_id;
      if req is not null then rel := 'request_sent';
      else
        select id into req from friend_requests where sender_id = p_id and receiver_id = v;
        if req is not null then rel := 'request_received'; end if;
      end if;
    end if;
  end if;
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', coalesce(p.display_name, p.username),
    'bio', p.bio, 'joined', p.created_at, 'status', p.status,
    'badges', coalesce((select jsonb_agg(b.badge) from user_badges b where b.profile_id = p.id), '[]'::jsonb),
    'friend_count', (select count(*) from friendships where user_a = p.id or user_b = p.id),
    'profile_views', p.profile_views,
    'last_seen', case when privacy_allows(p.id, 'online') then p.last_seen else null end,
    'relationship', rel, 'request_id', req);
end $$;

create or replace function get_friends(p_id bigint, p_limit integer, p_offset integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = p_id) then return null; end if;
  if not privacy_allows(p_id, 'friends') then
    return jsonb_build_object('hidden', true, 'friends', '[]'::jsonb);
  end if;
  return jsonb_build_object('hidden', false, 'friends', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id, 'username', f.username, 'display_name', coalesce(f.display_name, f.username),
      'badges', coalesce((select jsonb_agg(b.badge) from user_badges b where b.profile_id = f.id), '[]'::jsonb)) order by f.username)
    from (
      select pr.* from friendships fs
      join profiles pr on pr.id = case when fs.user_a = p_id then fs.user_b else fs.user_a end
      where (fs.user_a = p_id or fs.user_b = p_id) and pr.status <> 'banned'
      order by pr.username
      limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
    ) f), '[]'::jsonb));
end $$;

create or replace function get_public_inventory(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if not exists (select 1 from profiles where id = p_id) then return null; end if;
  if not privacy_allows(p_id, 'inventory') then
    return jsonb_build_object('hidden', true, 'items', '[]'::jsonb);
  end if;
  return jsonb_build_object('hidden', false, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'category', i.category, 'price', i.price, 'thumbnail_url', i.thumbnail_url) order by inv.acquired_at desc)
    from inventory inv join items i on i.id = inv.item_id
    where inv.profile_id = p_id and i.published), '[]'::jsonb));
end $$;

create or replace function get_my_friend_requests() returns jsonb
language sql stable security definer set search_path = 'public' as $$
  select jsonb_build_object(
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('request_id', r.id, 'id', p.id, 'username', p.username, 'display_name', coalesce(p.display_name, p.username)) order by r.created_at desc)
                          from friend_requests r join profiles p on p.id = r.sender_id where r.receiver_id = me_id()), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('request_id', r.id, 'id', p.id, 'username', p.username, 'display_name', coalesce(p.display_name, p.username)) order by r.created_at desc)
                          from friend_requests r join profiles p on p.id = r.receiver_id where r.sender_id = me_id()), '[]'::jsonb))
$$;

create or replace function get_my_blocks() returns jsonb
language sql stable security definer set search_path = 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username) order by p.username), '[]'::jsonb)
  from blocks b join profiles p on p.id = b.blocked_id where b.blocker_id = me_id()
$$;

create or replace function search_users(p_q text) returns jsonb
language plpgsql stable security definer set search_path = 'public' as $$
declare q text := trim(coalesce(p_q, '')); v bigint := me_id();
begin
  if v is null then raise exception 'Not signed in'; end if;
  if char_length(q) < 2 then return '[]'::jsonb; end if;
  q := left(replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_'), 30);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'username', p.username, 'display_name', coalesce(p.display_name, p.username),
      'badges', coalesce((select jsonb_agg(b.badge) from user_badges b where b.profile_id = p.id), '[]'::jsonb)) order by p.username)
    from (
      select * from profiles
      where status <> 'banned' and (username ilike q || '%' or display_name ilike q || '%')
        and not exists (select 1 from blocks where blocker_id = profiles.id and blocked_id = v)
      order by username limit 20
    ) p), '[]'::jsonb);
end $$;

create or replace function send_friend_request(p_target bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v bigint := me_id(); nm text;
begin
  if v is null then raise exception 'Not signed in'; end if;
  if p_target = v then raise exception 'You cannot add yourself'; end if;
  if not exists (select 1 from profiles where id = p_target and status <> 'banned') then raise exception 'User not found'; end if;
  if exists (select 1 from blocks where (blocker_id = v and blocked_id = p_target) or (blocker_id = p_target and blocked_id = v)) then
    raise exception 'You cannot send a request to this user'; end if;
  if are_friends(v, p_target) then raise exception 'You are already friends'; end if;
  if exists (select 1 from friend_requests where sender_id = p_target and receiver_id = v) then
    raise exception 'This user already sent you a request. Check your friend requests.'; end if;
  if exists (select 1 from friend_requests where sender_id = v and receiver_id = p_target) then
    raise exception 'Request already sent'; end if;
  if (select count(*) from friend_requests where sender_id = v) >= 50 then raise exception 'Too many pending requests'; end if;
  insert into friend_requests (sender_id, receiver_id) values (v, p_target);
  select coalesce(display_name, username) into nm from profiles where id = v;
  perform notify_user(p_target, 'friend_request', nm || ' sent you a friend request.', '/friends');
end $$;

create or replace function cancel_friend_request(p_request bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if me_id() is null then raise exception 'Not signed in'; end if;
  delete from friend_requests where id = p_request and sender_id = me_id();
  if not found then raise exception 'Request not found'; end if;
end $$;

create or replace function respond_friend_request(p_request bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v bigint := me_id(); r friend_requests; nm text;
begin
  if v is null then raise exception 'Not signed in'; end if;
  select * into r from friend_requests where id = p_request and receiver_id = v;
  if r.id is null then raise exception 'Request not found'; end if;
  delete from friend_requests where id = r.id;
  if p_accept then
    if exists (select 1 from blocks where (blocker_id = v and blocked_id = r.sender_id) or (blocker_id = r.sender_id and blocked_id = v)) then
      raise exception 'You cannot accept this request'; end if;
    insert into friendships (user_a, user_b) values (least(v, r.sender_id), greatest(v, r.sender_id)) on conflict do nothing;
    select coalesce(display_name, username) into nm from profiles where id = v;
    perform notify_user(r.sender_id, 'friend_accepted', nm || ' accepted your friend request.', '/users/' || v || '/profile');
  end if;
end $$;

create or replace function remove_friend(p_target bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if me_id() is null then raise exception 'Not signed in'; end if;
  delete from friendships where user_a = least(me_id(), p_target) and user_b = greatest(me_id(), p_target);
end $$;

create or replace function block_user(p_target bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v bigint := me_id();
begin
  if v is null then raise exception 'Not signed in'; end if;
  if p_target = v then raise exception 'You cannot block yourself'; end if;
  if not exists (select 1 from profiles where id = p_target) then raise exception 'User not found'; end if;
  delete from friendships where user_a = least(v, p_target) and user_b = greatest(v, p_target);
  delete from friend_requests where (sender_id = v and receiver_id = p_target) or (sender_id = p_target and receiver_id = v);
  insert into blocks (blocker_id, blocked_id) values (v, p_target) on conflict do nothing;
end $$;

create or replace function unblock_user(p_target bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if me_id() is null then raise exception 'Not signed in'; end if;
  delete from blocks where blocker_id = me_id() and blocked_id = p_target;
end $$;

create or replace function report_user(p_target bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v bigint := me_id();
begin
  if v is null then raise exception 'Not signed in'; end if;
  if p_target = v then raise exception 'You cannot report yourself'; end if;
  if not exists (select 1 from profiles where id = p_target) then raise exception 'User not found'; end if;
  if length(coalesce(trim(p_reason), '')) < 3 then raise exception 'Please explain the problem'; end if;
  if exists (select 1 from reports where reporter_id = v and reported_user_id = p_target and status = 'open') then
    raise exception 'You already have an open report on this user'; end if;
  insert into reports (reporter_id, reported_user_id, reason) values (v, p_target, left(trim(p_reason), 500));
end $$;

create or replace function update_my_profile(p_display_name text, p_bio text, p_privacy jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v bigint := me_id(); cleaned jsonb := '{}'::jsonb; k text; val text;
begin
  if v is null then raise exception 'Not signed in'; end if;
  foreach k in array array['friends', 'inventory', 'online'] loop
    val := coalesce(p_privacy ->> k, 'everyone');
    if val not in ('everyone', 'friends', 'nobody') then raise exception 'Bad privacy setting'; end if;
    cleaned := cleaned || jsonb_build_object(k, val);
  end loop;
  update profiles set display_name = nullif(trim(p_display_name), ''), bio = nullif(trim(p_bio), ''), privacy = cleaned where id = v;
end $$;

create or replace function record_profile_view(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if me_id() is not null and me_id() = p_id then return; end if;
  update profiles set profile_views = profile_views + 1 where id = p_id;
end $$;

create or replace function touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set last_seen = now()
  where id = me_id() and (last_seen is null or last_seen < now() - interval '4 minutes')
$$;

create or replace function mark_notifications_read() returns void
language plpgsql security definer set search_path = public as $$
begin
  if me_id() is null then raise exception 'Not signed in'; end if;
  update notifications set read = true where profile_id = me_id() and not read;
end $$;

-- Staff: badges. Owner has '*'. To let staff grant badges, add 'manage_badges' to their role's permissions.
create or replace function admin_set_badge(p_target bigint, p_badge text, p_granted boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('manage_badges') then raise exception 'Not allowed'; end if;
  if p_badge not in ('official_admin', 'verified') then raise exception 'Bad badge'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if not exists (select 1 from profiles where id = p_target) then raise exception 'User not found'; end if;
  if p_granted then
    insert into user_badges (profile_id, badge, granted_by) values (p_target, p_badge, me_id()) on conflict do nothing;
  else
    delete from user_badges where profile_id = p_target and badge = p_badge;
  end if;
  perform log_admin(case when p_granted then 'grant_badge' else 'revoke_badge' end, 'user ' || p_target || ' ' || p_badge, p_reason);
end $$;

create or replace function admin_user_detail(p_target bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles;
begin
  if not has_perm('view_admin') then raise exception 'Not allowed'; end if;
  select * into p from profiles where id = p_target;
  if p.id is null then return null; end if;
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', coalesce(p.display_name, p.username),
    'status', p.status, 'status_until', p.status_until, 'balance', p.balance, 'created_at', p.created_at,
    'role', (select name from roles where id = p.role_id),
    'profile_views', p.profile_views,
    'friend_count', (select count(*) from friendships where user_a = p.id or user_b = p.id),
    'reports_against', (select count(*) from reports where reported_user_id = p.id),
    'badges', coalesce((select jsonb_agg(b.badge) from user_badges b where b.profile_id = p.id), '[]'::jsonb),
    'warnings', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'admin_id', w.admin_id, 'reason', w.reason, 'created_at', w.created_at) order by w.id desc)
                          from warnings w where w.profile_id = p.id), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'admin_id', a.admin_id, 'action', a.action, 'target', a.target, 'reason', a.reason, 'created_at', a.created_at) order by a.id desc)
                       from (select * from audit_log where target = 'user ' || p.id or target like 'user ' || p.id || ' %' order by id desc limit 25) a), '[]'::jsonb));
end $$;

-- Warnings now notify the user.
create or replace function admin_warn(p_target bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('warn_users') then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if not exists (select 1 from profiles where id = p_target) then raise exception 'User not found'; end if;
  insert into warnings (profile_id, admin_id, reason) values (p_target, me_id(), p_reason);
  perform notify_user(p_target, 'warning', 'Your account received a warning: ' || left(p_reason, 200), '/users/' || p_target || '/profile');
  perform log_admin('warn', 'user ' || p_target, p_reason);
end $$;

insert into user_badges (profile_id, badge) select id, 'official_admin' from profiles where id = 1 on conflict do nothing;

do $$
declare f text;
begin
  foreach f in array array[
    'get_my_friend_requests()', 'get_my_blocks()', 'search_users(text)',
    'send_friend_request(bigint)', 'cancel_friend_request(bigint)', 'respond_friend_request(bigint,boolean)',
    'remove_friend(bigint)', 'block_user(bigint)', 'unblock_user(bigint)', 'report_user(bigint,text)',
    'update_my_profile(text,text,jsonb)', 'touch_last_seen()', 'mark_notifications_read()',
    'admin_set_badge(bigint,text,boolean,text)', 'admin_user_detail(bigint)', 'admin_warn(bigint,text)']
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'are_friends(bigint,bigint)', 'privacy_allows(bigint,text)', 'get_public_profile(bigint)',
    'get_friends(bigint,integer,integer)', 'get_public_inventory(bigint)', 'record_profile_view(bigint)']
  loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
