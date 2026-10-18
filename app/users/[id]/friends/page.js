import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import UserRow from '@/components/UserRow';

export default async function UserFriends({ params }) {
  const { sb } = await getSession();
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [{ data: p }, { data: fr }] = await Promise.all([
    sb.rpc('get_public_profile', { p_id: id }),
    sb.rpc('get_friends', { p_id: id, p_limit: 100, p_offset: 0 }),
  ]);
  if (!p) notFound();
  const friends = fr?.friends || [];
  return (
    <>
      <h1>{p.display_name}&apos;s friends</h1>
      <p><Link href={`/users/${p.id}/profile`}>&larr; Back to profile</Link></p>
      {fr?.hidden ? <p className="muted">This user keeps their friends list private.</p>
        : friends.length === 0 ? <p>No friends yet.</p>
        : friends.map((f) => <UserRow key={f.id} u={f} />)}
    </>
  );
}
