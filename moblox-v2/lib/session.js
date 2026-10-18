import { serverClient } from '@/lib/supabase/server';

export async function getSession() {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, me: null, perms: [], isStaff: false };
  const { data: me } = await sb
    .from('profiles')
    .select('id,username,balance,status,status_until,role_id,created_at,roles(name,permissions)')
    .eq('auth_id', user.id)
    .maybeSingle();
  const perms = me?.roles?.permissions || [];
  const isStaff = perms.includes('*') || perms.includes('view_admin');
  return { sb, user, me, perms, isStaff };
}

export function restriction(me) {
  if (!me) return null;
  if (me.status === 'banned') return 'banned';
  if (me.status === 'suspended' && (!me.status_until || new Date(me.status_until) > new Date())) return 'suspended';
  return null;
}
