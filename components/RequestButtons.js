'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RequestButtons({ requestId, kind }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function act(fn, args) {
    setBusy(true); setMsg('');
    const { error } = await createClient().rpc(fn, args);
    setBusy(false);
    if (error) setMsg(error.message); else router.refresh();
  }
  return (
    <>
      {kind === 'outgoing' ? (
        <button className="btn" disabled={busy} onClick={() => act('cancel_friend_request', { p_request: requestId })}>Cancel request</button>
      ) : (
        <>
          <button className="btn primary" disabled={busy} onClick={() => act('respond_friend_request', { p_request: requestId, p_accept: true })}>Accept</button>
          <button className="btn" disabled={busy} onClick={() => act('respond_friend_request', { p_request: requestId, p_accept: false })}>Decline</button>
        </>
      )}
      {msg && <em className="note"> {msg}</em>}
    </>
  );
}
