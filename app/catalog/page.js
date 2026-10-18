import { publicClient } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Catalog() {
  const db = publicClient();
  let items = [];
  let error = null;
  if (!db) error = 'Database not connected yet. Add the Supabase environment variables.';
  else {
    const res = await db.from('items').select('id,name,price,category').eq('published', true).order('created_at', { ascending: false }).limit(48);
    if (res.error) error = res.error.message; else items = res.data;
  }
  return (
    <>
      <h1>Catalog</h1>
      {error && <p>{error}</p>}
      {!error && items.length === 0 && <p>No items yet.</p>}
      <div className="grid">
        {items.map((i) => (
          <div className="card" key={i.id}>
            <div className="thumb">{i.category}</div>
            <b>{i.name}</b>
            <div className="price">{i.price} coins</div>
          </div>
        ))}
      </div>
    </>
  );
}
