'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RetryRestrictionCheck() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function retry() {
    setBusy(true); setMessage('');
    const { data, error } = await createClient().rpc('my_restriction');
    setBusy(false);
    if (error) setMessage('The status check is still unavailable. Please try again in a moment.');
    else if (data) router.refresh();
    else { router.replace('/'); router.refresh(); }
  }
  return <div className="restriction-actions"><button className="btn primary" disabled={busy} onClick={retry}>{busy ? 'Checking...' : 'Retry status check'}</button>{message && <p role="status" className="note">{message}</p>}</div>;
}
