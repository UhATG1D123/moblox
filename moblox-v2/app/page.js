import Link from 'next/link';
import { getSession } from '@/lib/session';
import ItemCard from '@/components/ItemCard';

export default async function Home() {
  const { sb, me } = await getSession();
  const { data: items } = await sb
    .from('items').select('id,name,price,category,thumbnail_url')
    .eq('published', true).order('created_at', { ascending: false }).limit(12);
  return (
    <>
      <div className="hello">
        <span className="av big">{me ? me.username[0].toUpperCase() : 'M'}</span>
        <h1>{me ? `Welcome, ${me.username}` : 'Welcome to Moblox'}</h1>
      </div>
      {!me && (
        <p className="muted">
          <Link className="btn primary" href="/signup">Sign Up</Link>{' '}
          <Link className="btn" href="/login">Log In</Link>
        </p>
      )}
      <p className="muted">Independent project. Not affiliated with Roblox. MoBux is a virtual currency with no real-world value.</p>
      <div className="rowhead"><h2>Recommended For You</h2><Link href="/catalog">See All →</Link></div>
      {(!items || items.length === 0) ? <p>No items yet.</p> : (
        <div className="grid">{items.map((i) => <ItemCard key={i.id} item={i} />)}</div>
      )}
    </>
  );
}
