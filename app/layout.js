import './globals.css';
import { getSession } from '@/lib/session';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Heartbeat from '@/components/Heartbeat';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Moblox', description: 'Moblox - an independent avatar shop community' };

export default async function RootLayout({ children }) {
  const { sb, me, isStaff, restriction, restrictionError, warnings } = await getSession();
  let unread = 0;
  if (me) {
    const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('profile_id', me.id).eq('read', false);
    unread = count || 0;
  }
  const blocked = !!restriction || restrictionError;
  return <html lang="en"><body>
    <Topbar me={me} unread={unread} />
    {me && !blocked && <Heartbeat />}
    <div className="shell">
      {!blocked && <Sidebar me={me} isStaff={isStaff} />}
      <main className={blocked ? 'main main-restricted' : 'main'}>
        {!blocked && warnings.length > 0 && <div className="banner warning-banner"><b>Account warning{warnings.length === 1 ? '' : 's'} need your acknowledgment</b><p>Please review the notice{warnings.length === 1 ? '' : 's'} below. Your access is not limited by a warning.</p><a className="btn" href="/warnings">Review warnings</a></div>}
        {children}
      </main>
    </div>
  </body></html>;
}
