import Link from 'next/link';
import Badges from './Badges';

export default function UserRow({ u, children }) {
  return (
    <div className="urow">
      <Link href={`/users/${u.id}/profile`} className="who">
        <span className="av sm">{u.username[0].toUpperCase()}</span>
        <span>{u.display_name || u.username}</span>
      </Link>
      <Badges badges={u.badges} size={16} />
      <span className="muted">@{u.username}</span>
      <span className="urow-actions">{children}</span>
    </div>
  );
}
