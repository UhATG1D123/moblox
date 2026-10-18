import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import MoBux from '@/components/MoBux';
import ItemCard from '@/components/ItemCard';

export default async function Profile({ params }) {
  const { sb, me } = await getSession();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const { data: p } = await sb.from('public_profiles').select('id,username,created_at,banned').eq('id', id).maybeSingle();
  if (!p) notFound();
  const { data: inv } = await sb
    .from('public_inventory').select('item_id,name,category,price')
    .eq('profile_id', id).order('acquired_at', { ascending: false });
  const own = me?.id === id;
  let warns = [];
  if (own) {
    const { data } = await sb.from('warnings').select('id,reason,created_at').eq('profile_id', id).order('id', { ascending: false });
    warns = data || [];
  }
  return (
    <>
      <div className="profilehead">
        <span className="av huge">{p.username[0].toUpperCase()}</span>
        <div>
          <h1>{p.username}</h1>
          <p className="muted">User ID {p.id} · Joined {new Date(p.created_at).toLocaleDateString('en-US')}</p>
          {p.banned && <p className="note">This account is banned.</p>}
          <div className="chips"><span className="chip">{(inv || []).length} items</span>{own && <span className="chip"><MoBux n={me.balance} /></span>}</div>
        </div>
        {own && <Link className="btn" href="/settings">Settings</Link>}
      </div>
      {own && warns.length > 0 && (
        <div className="banner bad">
          <b>Warnings on your account</b>
          {warns.map((w) => <div key={w.id}>{new Date(w.created_at).toLocaleDateString('en-US')}: {w.reason}</div>)}
        </div>
      )}
      <h2>Collections</h2>
      {(inv || []).length === 0 ? <p>No items yet.</p> : (
        <div className="grid">
          {inv.map((i) => <ItemCard key={i.item_id} item={{ id: i.item_id, name: i.name, category: i.category, price: i.price }} />)}
        </div>
      )}
    </>
  );
}
