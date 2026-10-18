-- Profile picture uploads with private storage and manual moderation.
alter table public.profiles add column if not exists avatar_path text;

create table if not exists public.profile_photo_requests (
  id bigint generated always as identity primary key,
  profile_id bigint not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by bigint references public.profiles(id),
  review_note text
);

alter table public.profile_photo_requests enable row level security;

drop policy if exists "users create own profile photo requests" on public.profile_photo_requests;
create policy "users create own profile photo requests"
on public.profile_photo_requests for insert to authenticated
with check (
  profile_id = public.me_id()
  and status = 'pending'
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'profile-photos' and o.name = storage_path
  )
);

drop policy if exists "users read own profile photo requests" on public.profile_photo_requests;
create policy "users read own profile photo requests"
on public.profile_photo_requests for select to authenticated
using (profile_id = public.me_id() or public.has_perm('view_admin'));

drop policy if exists "staff read profile photo requests" on public.profile_photo_requests;
create policy "staff read profile photo requests"
on public.profile_photo_requests for select to authenticated
using (public.has_perm('view_admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 2097152, array['image/png'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/png'];

drop policy if exists "users upload own profile photos" on storage.objects;
create policy "users upload own profile photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = 'png'
);

drop policy if exists "read approved profile photos" on storage.objects;
create policy "read approved profile photos"
on storage.objects for select to authenticated, anon
using (
  bucket_id = 'profile-photos'
  and exists (select 1 from public.profiles p where p.avatar_path = name)
);

create or replace function public.admin_review_profile_photo(p_request bigint, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.profile_photo_requests;
begin
  if not public.has_perm('view_admin') then raise exception 'Not allowed'; end if;
  select * into r from public.profile_photo_requests where id = p_request and status = 'pending' for update;
  if not found then raise exception 'Pending request not found'; end if;
  update public.profile_photo_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_at = now(), reviewed_by = public.me_id(), review_note = nullif(left(trim(coalesce(p_note,'')),300),'')
  where id = p_request;
  if p_approve then
    update public.profiles set avatar_path = r.storage_path where id = r.profile_id;
  end if;
  perform public.log_admin(
    case when p_approve then 'approve_profile_photo' else 'reject_profile_photo' end,
    'request ' || p_request || ' for user ' || r.profile_id,
    coalesce(nullif(trim(p_note),''), 'Profile picture moderation')
  );
end $$;

revoke execute on function public.admin_review_profile_photo(bigint, boolean, text) from public, anon;
grant execute on function public.admin_review_profile_photo(bigint, boolean, text) to authenticated;
