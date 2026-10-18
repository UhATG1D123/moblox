import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import ItemCard from '@/components/ItemCard';

export default async function Inventory() {
  const { sb, me } = await getSession();
  if (!me) redirect('/login');
  const { data } = await sb
    .from('inventory').select('acquired_at, items(id,name,price,category,thumbnail_url)')
    .eq('profile_id', me.id).order('acquired_at', { ascending: false });
  const items = (data || []).map((r) => r.items).filter(Boolean);
  return (
    <>
      <h1>Inventory</h1>
      {items.length === 0 ? <p>You don't own anything yet. Visit the Marketplace!</p> : (
        <div className="grid">{items.map((i) => <ItemCard key={i.id} item={i} />)}</div>
      )}
    </>
  );
}
