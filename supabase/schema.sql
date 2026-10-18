-- Moblox schema. Paste into Supabase > SQL Editor > Run.

create table roles (
  id serial primary key,
  name text unique not null,
  permissions text[] not null default '{}'
);
insert into roles (name, permissions) values
  ('owner', array['*']),
  ('staff', array['view_admin','warn_users','suspend_users','ban_users','edit_catalog','review_reports','adjust_currency']),
  ('user',  array[]::text[]);

create table profiles (
  id bigint generated always as identity (start with 1 minvalue 1) primary key,
  auth_id uuid unique not null references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  role_id int not null references roles(id) default 3,
  balance integer not null default 100 check (balance >= 0),
  status text not null default 'active' check (status in ('active','suspended','banned','terminated')),
  status_until timestamptz,
  status_reason text,
  status_category text,
  status_issued_at timestamptz,
  created_at timestamptz not null default now()
);

create table items (
  id bigint generated always as identity primary key,
  name text not null,
  description text not null default '',
  category text not null,
  price integer not null check (price >= 0),
  thumbnail_url text,
  creator_id bigint references profiles(id),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table inventory (
  profile_id bigint not null references profiles(id) on delete cascade,
  item_id bigint not null references items(id),
  acquired_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

create table ledger (
  id bigint generated always as identity primary key,
  profile_id bigint not null references profiles(id),
  amount integer not null,
  kind text not null check (kind in ('purchase','grant','admin_adjust','sale')),
  item_id bigint references items(id),
  reason text,
  actor_id bigint references profiles(id),
  created_at timestamptz not null default now()
);

create table warnings (
  id bigint generated always as identity primary key,
  profile_id bigint not null references profiles(id),
  admin_id bigint not null references profiles(id),
  reason text not null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table reports (
  id bigint generated always as identity primary key,
  reporter_id bigint not null references profiles(id),
  item_id bigint references items(id),
  reason text not null,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  admin_id bigint not null references profiles(id),
  action text not null,
  target text,
  reason text,
  created_at timestamptz not null default now()
);

-- First account ever = ID 1, username Moblox, owner. Everyone else = normal user.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  if not exists (select 1 from profiles) then
    insert into profiles (auth_id, username, role_id) values (new.id, 'Moblox', 1);
  else
    uname := new.raw_user_meta_data->>'username';
    if uname is null or lower(uname) = 'moblox' then
      raise exception 'Invalid username';
    end if;
    insert into profiles (auth_id, username) values (new.id, uname);
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Atomic purchase. Price, balance and ownership are all checked on the server.
create function purchase_item(p_item_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; it items;
begin
  select * into me from profiles where auth_id = auth.uid() for update;
  if me.id is null then raise exception 'Not signed in'; end if;
  if me.status <> 'active' then raise exception 'Account restricted'; end if;
  select * into it from items where id = p_item_id and published;
  if it.id is null then raise exception 'Item unavailable'; end if;
  if exists (select 1 from inventory where profile_id = me.id and item_id = it.id) then
    raise exception 'Already owned'; end if;
  if me.balance < it.price then raise exception 'Insufficient balance'; end if;
  update profiles set balance = balance - it.price where id = me.id;
  insert into inventory (profile_id, item_id) values (me.id, it.id);
  insert into ledger (profile_id, amount, kind, item_id) values (me.id, -it.price, 'purchase', it.id);
end $$;

-- Lock everything down. Reads are explicit; all writes go through functions or the server.
alter table roles enable row level security;
alter table profiles enable row level security;
alter table items enable row level security;
alter table inventory enable row level security;
alter table ledger enable row level security;
alter table warnings enable row level security;
alter table reports enable row level security;
alter table audit_log enable row level security;

create policy "published items are public" on items for select using (published);
create policy "own profile" on profiles for select using (auth_id = auth.uid());
create policy "own inventory" on inventory for select
  using (profile_id in (select id from profiles where auth_id = auth.uid()));
create policy "own ledger" on ledger for select
  using (profile_id in (select id from profiles where auth_id = auth.uid()));
create policy "own warnings" on warnings for select
  using (profile_id in (select id from profiles where auth_id = auth.uid()));

revoke execute on function purchase_item(bigint) from public, anon;
grant execute on function purchase_item(bigint) to authenticated;

insert into items (name, description, category, price) values
 ('Sample Cap','A starter cap','Hats',20),
 ('Sample Hair','Spiky hair','Hair',35),
 ('Smile Face','Classic smile','Faces',10),
 ('Blue Shirt','Plain blue shirt','Clothing',15),
 ('Gold Wings','Shiny wings','Accessories',120),
 ('Top Hat','Fancy top hat','Hats',60);
