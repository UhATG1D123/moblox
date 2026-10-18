import Link from 'next/link';
import MoBux from './MoBux';

export default function ItemCard({ item }) {
  return (
    <Link href={`/catalog/${item.id}`} className="icard">
      <div className="thumb">
        {item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.name} /> : <span>{item.category}</span>}
      </div>
      <div className="iname">{item.name}</div>
      <div className="iprice"><MoBux n={item.price} /></div>
    </Link>
  );
}
