import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import MoBux from '@/components/MoBux';
import BuyPanel from '@/components/BuyPanel';

export default async function ItemPage({ params }) {
  const { sb, me } = await getSession();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const { data: item } = await sb
    .from('items').select('id,name,description,category,price,thumbnail_url,created_at,published')
    .eq('id', id).maybeSingle();
  if (!item) notFound();
  let owned = false;
  if (me) {
    const { data } = await sb.from('inventory').select('item_id').eq('profile_id', me.id).eq('item_id', id).maybeSingle();
    owned = !!data;
  }
  return (
    <div className="itemgrid">
      <div className="thumb bigthumb">
        {item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.name} /> : <span>{item.category}</span>}
      </div>
      <div>
        <h1>{item.name}</h1>
        {!item.published && <p className="note">Unpublished (only staff can see this).</p>}
        <p className="muted">Category: {item.category}</p>
        <p>{item.description || 'No description.'}</p>
        <p className="bigprice"><MoBux n={item.price} /></p>
        <BuyPanel itemId={item.id} price={item.price} owned={owned} loggedIn={!!me} balance={me?.balance ?? 0} />
      </div>
    </div>
  );
}
