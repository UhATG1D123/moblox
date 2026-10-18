import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import UserRow from '@/components/UserRow';
import RequestButtons from '@/components/RequestButtons';
import AddFriendButton from '@/components/AddFriendButton';

export default async function Friends({ searchParams }) {
  const { sb, me } = await getSession();
  if (!me) redirect('/login');
  const raw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const q = String(raw ?? '').trim().slice(0, 30);

  const [{ data: reqs }, { data: fr }, found] = await Promise.all([
    sb.rpc('get_my_friend_requests'),
    sb.rpc('get_friends', { p_id: me.id, p_limit: 100, p_offset: 0 }),
    q.length >= 2 ? sb.rpc('search_users', { p_q: q }) : Promise.resolve({ data: null }),
  ]);
  const incoming = reqs?.incoming || [];
  const outgoing = reqs?.outgoing || [];
  const friends = fr?.friends || [];
  const friendIds = new Set(friends.map((f) => f.id));
  const results = (found.data || []).filter((u) => u.id !== me.id);

  return (
    <>
      <h1>Friends</h1>

      <h2>Find people</h2>
      <form method="get" className="filters">
        <input name="q" defaultValue={q} placeholder="Search by username" />
        <button className="btn primary">Search</button>
      </form>
      {q.length > 0 && q.length < 2 && <p className="muted">Type at least 2 characters.</p>}
      {q.length >= 2 && results.length === 0 && <p className="muted">No users found.</p>}
      {results.map((u) => (
        <UserRow key={u.id} u={u}>{friendIds.has(u.id) ? <span className="muted">Already friends</span> : <AddFriendButton userId={u.id} />}</UserRow>
      ))}

      {incoming.length > 0 && (
        <>
          <h2>Friend requests ({incoming.length})</h2>
          {incoming.map((r) => <UserRow key={r.request_id} u={r}><RequestButtons kind="incoming" requestId={r.request_id} /></UserRow>)}
        </>
      )}
      {outgoing.length > 0 && (
        <>
          <h2>Sent requests</h2>
          {outgoing.map((r) => <UserRow key={r.request_id} u={r}><RequestButtons kind="outgoing" requestId={r.request_id} /></UserRow>)}
        </>
      )}

      <h2>Your friends ({friends.length})</h2>
      {friends.length === 0 ? <p>You have no friends yet. Search for a username above to send a request.</p>
        : friends.map((f) => <UserRow key={f.id} u={f} />)}
    </>
  );
}
