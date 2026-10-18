import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import MoBux from '@/components/MoBux';
import ItemCard from '@/components/ItemCard';
import Badges from '@/components/Badges';
import FriendActions from '@/components/FriendActions';
import ProfileViewPing from '@/components/ProfileViewPing';
import ProfileAvatar from '@/components/ProfileAvatar';

export default async function Profile({ params }) {
  const { sb, me } = await getSession();
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const [{ data: p }, { data: inv }, { data: fr }] = await Promise.all([
    sb.rpc('get_public_profile', { p_id: id }),
    sb.rpc('get_public_inventory', { p_id: id }),
    sb.rpc('get_friends', { p_id: id, p_limit: 8, p_offset: 0 }),
  ]);
  if (!p) notFound();

  let avatarUrl = null;
  if (p.avatar_path) {
    const { data } = await sb.storage.from('profile-photos').createSignedUrl(p.avatar_path, 3600);
    avatarUrl = data?.signedUrl || null;
  }
  const own = p.relationship === 'self';
  const items = inv?.items || [];
  const friends = fr?.friends || [];
  let warns = [];
  if (own) {
    const { data } = await sb.from('warnings').select('id,reason,created_at').eq('profile_id', id).order('id', { ascending: false });
    warns = data || [];
  }

  return (
    <>
      <ProfileViewPing id={id} />
      <div className="profilehead">
        <span className="av huge">{avatarUrl ? <img src={avatarUrl} alt={p.username + ' profile picture'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : p.username[0].toUpperCase()}</span>
        <div>
          <h1>{p.display_name}<Badges badges={p.badges} size={26} /></h1>
          <p className="muted">@{p.username} &middot; User ID {p.id} &middot; Joined {new Date(p.joined).toLocaleDateString('en-US')}</p>
          {p.status === 'banned' && <p className="note">This account is banned.</p>}
          {p.last_seen && <p className="muted">Last seen {new Date(p.last_seen).toLocaleDateString('en-US')}</p>}
          <div className="chips">
            <Link className="chip" href={`/users/${p.id}/friends`}>{p.friend_count} friends</Link>
            <span className="chip">{inv?.hidden ? 'Inventory private' : `${items.length} items`}</span>
            <span className="chip">{p.profile_views} profile views</span>
            {own && me && <span className="chip"><MoBux n={me.balance} /></span>}
          </div>
        </div>
        {own && <Link className="btn" href="/settings">Edit profile</Link>}
      </div>

      {p.bio && <p className="bio">{p.bio}</p>}
      <FriendActions userId={p.id} relationship={p.relationship} requestId={p.request_id} loggedIn={!!me} />

      {own && warns.length > 0 && (
        <div className="banner bad">
          <b>Warnings on your account</b>
          {warns.map((w) => <div key={w.id}>{new Date(w.created_at).toLocaleDateString('en-US')}: {w.reason}</div>)}
        </div>
      )}

      <div className="rowhead"><h2>Friends</h2>{friends.length > 0 && <Link href={`/users/${p.id}/friends`}>See all</Link>}</div>
      {fr?.hidden ? <p className="muted">This user keeps their friends list private.</p>
        : friends.length === 0 ? <p className="muted">No friends yet.</p> : (
          <div className="fgrid">
            {friends.map((f) => (
              <Link key={f.id} href={`/users/${f.id}/profile`} className="fcard">
                <ProfileAvatar userId={f.id} username={f.username} className="av" />
                <div>{f.display_name}<Badges badges={f.badges} size={14} /></div>
              </Link>
            ))}
          </div>
        )}

      <h2>Collections</h2>
      {inv?.hidden ? <p className="muted">This user keeps their inventory private.</p>
        : items.length === 0 ? <p>No items yet.</p> : (
          <div className="grid">{items.map((i) => <ItemCard key={i.id} item={i} />)}</div>
        )}
    </>
  );
}