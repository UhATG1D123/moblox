'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AddFriendButton({ userId }) {
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState('');
  async function add() {
    setState('busy'); setMsg('');
    const { error } = await createClient().rpc('send_friend_request', { p_target: userId });
    if (error) { setState('idle'); setMsg(error.message); } else setState('sent');
  }
  if (state === 'sent') return <span className="muted">Request sent</span>;
  return (
    <>
      <button className="btn primary" disabled={state === 'busy'} onClick={add}>Add friend</button>
      {msg && <em className="note"> {msg}</em>}
    </>
  );
}
