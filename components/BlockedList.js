'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function BlockedList({ blocks }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  async function unblock(id) {
    const { error } = await createClient().rpc('unblock_user', { p_target: id });
    if (error) setMsg(error.message); else router.refresh();
  }
  if (!blocks.length) return <p className="muted">You have not blocked anyone.</p>;
  return (
    <div>
      {blocks.map((u) => (
        <div className="urow" key={u.id}><span>@{u.username}</span><span className="urow-actions"><button className="btn" onClick={() => unblock(u.id)}>Unblock</button></span></div>
      ))}
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}
