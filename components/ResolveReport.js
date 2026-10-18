'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResolveReport({ id }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  async function go(status) {
    const { error } = await createClient().rpc('admin_resolve_report', { p_report: id, p_status: status, p_reason: reason });
    if (error) setMsg(error.message); else router.refresh();
  }
  return (
    <span className="resolve">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
      <button className="btn" onClick={() => go('actioned')}>Action taken</button>
      <button className="btn" onClick={() => go('dismissed')}>Dismiss</button>
      {msg && <em className="note"> {msg}</em>}
    </span>
  );
}
