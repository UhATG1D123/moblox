-- Allow the server-side login route to resolve usernames without exposing account emails publicly.
create or replace function public.lookup_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.auth_id = u.id
  where lower(p.username) = lower(trim(p_username))
  limit 1
$$;

revoke all on function public.lookup_login_email(text) from public, anon, authenticated;
grant execute on function public.lookup_login_email(text) to service_role;
