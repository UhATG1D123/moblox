import Link from 'next/link';
import Badges from './Badges';
import ProfileAvatar from './ProfileAvatar';

export default function UserRow({ u, children }) {
  return (
    <div className="urow">
      <Link href={`/users/${u.id}/profile`} className="who">
        <ProfileAvatar userId={u.id} username={u.username} />
        <span>{u.display_name || u.username}</span>
      </Link>
      <Badges badges={u.badges} size={16} />
      <span className="muted">@{u.username}</span>
      <span className="urow-actions">{children}</span>
    </div>
  );
}