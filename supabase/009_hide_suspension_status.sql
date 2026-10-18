-- Keep temporary suspensions private on public profiles and present terminated accounts as banned.
CREATE OR REPLACE FUNCTION public.get_public_profile(p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  p profiles;
  v bigint := me_id();
  rel text := 'none';
begin
  select * into p from profiles where id = p_id;
  if not found then return null; end if;
  if v is not null and v <> p_id and exists (
    select 1 from blocks where blocker_id = p_id and blocked_id = v
  ) then
    return null;
  end if;
  if v is null then rel := 'none';
  elsif v = p_id then rel := 'self';
  elsif exists (select 1 from blocks where blocker_id = v and blocked_id = p_id) then rel := 'blocked';
  elsif are_friends(v, p_id) then rel := 'friends';
  elsif exists (select 1 from friend_requests where sender_id = v and receiver_id = p_id) then rel := 'request_sent';
  elsif exists (select 1 from friend_requests where sender_id = p_id and receiver_id = v) then rel := 'request_received';
  end if;
  return jsonb_build_object(
    'id', p.id,
    'url', '/users/' || p.id || '/profile',
    'username', p.username,
    'display_name', coalesce(p.display_name, p.username),
    'bio', case when p.status = 'banned' then '' else p.bio end,
    'joined', p.created_at,
    'status', case when p.status = 'terminated' then 'banned' when p.status = 'suspended' then 'active' else p.status end,
    'profile_views', p.profile_views,
    'last_seen', case when privacy_allows(p.id, 'online') then p.last_seen end,
    'badges', coalesce((select jsonb_agg(badge order by badge) from user_badges where profile_id = p.id), '[]'::jsonb),
    'friend_count', (select count(*) from friendships where user_a = p.id or user_b = p.id),
    'relationship', rel,
    'request_id', (select id from friend_requests
                   where (sender_id = v and receiver_id = p_id) or (sender_id = p_id and receiver_id = v) limit 1)
  );
end
$function$;
