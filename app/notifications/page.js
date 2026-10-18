import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import MarkRead from '@/components/MarkRead';

export default async function Notifications() {
  const { sb, me } = await getSession();
  if (!me) redirect('/login');
  const { data } = await sb.from('notifications').select('id,kind,body,link,read,created_at').eq('profile_id', me.id).order('id', { ascending: false }).limit(50);
  const list = data || [];
  const safe = (l) => typeof l === 'string' && l.startsWith('/') && !l.startsWith('//');
  return (
    <>
      <h1>Notifications</h1>
      {list.some((n) => !n.read) && <MarkRead />}
      {list.length === 0 ? <p>Nothing here yet. Friend requests and account notices will show up here.</p> : (
        <ul className="nlist">
          {list.map((n) => (
            <li key={n.id} className={n.read ? '' : 'unread'}>
              {safe(n.link) ? <Link href={n.link}>{n.body}</Link> : n.body}
              <time>{new Date(n.created_at).toLocaleString('en-US')}</time>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
