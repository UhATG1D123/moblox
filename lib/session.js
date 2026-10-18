import { cache } from 'react';
import { serverClient } from '@/lib/supabase/server';

export const getSession = cache(async () => {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, me: null, perms: [], isStaff: false, restriction: null, restrictionError: false, warnings: [], warningError: false };

  const [{ data: me }, rr, wr] = await Promise.all([
    sb.from('profiles').select('id,username,balance,status,status_until,role_id,created_at,roles(name,permissions)').eq('auth_id', user.id).maybeSingle(),
    sb.rpc('my_restriction'),
    sb.rpc('my_unacknowledged_warnings'),
  ]);
  const restrictionError = !!rr.error;
  const warningError = !!wr.error;
  const restriction = rr.data || null;
  const perms = me?.roles?.permissions || [];
  const isStaff = !restriction && !restrictionError && !warningError && (perms.includes('*') || perms.includes('view_admin'));
  return { sb, user, me, perms, isStaff, restriction, restrictionError, warnings: warningError ? [] : (wr.data || []), warningError };
});

export function restriction(me) {
  if (!me) return null;
  if (me.status === 'terminated' || me.status === 'banned') return me.status;
  if (me.status === 'suspended' && (!me.status_until || new Date(me.status_until) > new Date())) return 'suspended';
  return null;
}
