import Link from 'next/link';
import { getSession } from '@/lib/session';
import ItemCard from '@/components/ItemCard';

const CATS = ['Hats', 'Hair', 'Faces', 'Clothing', 'Accessories'];
const PER = 24;

export default async function Catalog({ searchParams }) {
  const { sb } = await getSession();
  const q = (searchParams.q || '').trim().slice(0, 50);
  const cat = CATS.includes(searchParams.cat) ? searchParams.cat : '';
  const sort = ['new', 'low', 'high'].includes(searchParams.sort) ? searchParams.sort : 'new';
  const max = parseInt(searchParams.max, 10);
  const page = Math.max(1, parseInt(searchParams.page, 10) || 1);

  let query = sb.from('items').select('id,name,price,category,thumbnail_url', { count: 'exact' }).eq('published', true);
  if (q) query = query.ilike('name', `%${q.replace(/[%_,]/g, ' ')}%`);
  if (cat) query = query.eq('category', cat);
  if (Number.isFinite(max)) query = query.lte('price', max);
  query = sort === 'low' ? query.order('price', { ascending: true })
    : sort === 'high' ? query.order('price', { ascending: false })
    : query.order('created_at', { ascending: false });
  const { data: items, count, error } = await query.range((page - 1) * PER, page * PER - 1);

  const link = (p) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q); if (cat) sp.set('cat', cat); if (sort !== 'new') sp.set('sort', sort);
    if (Number.isFinite(max)) sp.set('max', String(max)); sp.set('page', String(p));
    return `/catalog?${sp.toString()}`;
  };
  const pages = Math.max(1, Math.ceil((count || 0) / PER));

  return (
    <>
      <h1>Marketplace</h1>
      <form className="filters" method="get">
        <input name="q" defaultValue={q} placeholder="Search" />
        <select name="cat" defaultValue={cat}>
          <option value="">All categories</option>
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input name="max" type="number" min="0" defaultValue={Number.isFinite(max) ? max : ''} placeholder="Max price" />
        <select name="sort" defaultValue={sort}>
          <option value="new">Newest</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
        <button className="btn primary">Apply</button>
      </form>
      {error && <p className="note">{error.message}</p>}
      {!error && (!items || items.length === 0) && <p>No items match your search.</p>}
      <div className="grid">{(items || []).map((i) => <ItemCard key={i.id} item={i} />)}</div>
      {pages > 1 && (
        <p className="pager">
          {page > 1 && <Link className="btn" href={link(page - 1)}>← Previous</Link>}{' '}
          Page {page} of {pages}{' '}
          {page < pages && <Link className="btn" href={link(page + 1)}>Next →</Link>}
        </p>
      )}
    </>
  );
}
