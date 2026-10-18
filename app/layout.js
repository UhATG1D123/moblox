import './globals.css';
import { getSession, restriction } from '@/lib/session';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Heartbeat from '@/components/Heartbeat';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Moblox', description: 'Moblox - an independent avatar shop community' };

export default async function RootLayout({ children }) {
  const { sb, me, isStaff } = await getSession();
  const r = restriction(me);
  let unread = 0;
  if (me) {
    const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('profile_id', me.id).eq('read', false);
    unread = count || 0;
  }
  return (
    <html lang="en">
      <body>
        <Topbar me={me} unread={unread} />
        {me && <Heartbeat />}
        <div className="shell">
          <Sidebar me={me} isStaff={isStaff} />
          <main className="main">
            {r === 'banned' && <div className="banner bad">Your account has been banned. You can browse, but you cannot buy items.</div>}
            {r === 'suspended' && (
              <div className="banner bad">
                Your account is suspended{me.status_until ? ` until ${new Date(me.status_until).toUTCString()}` : ''}. You cannot buy items right now.
              </div>
            )}
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
