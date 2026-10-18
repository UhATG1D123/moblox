'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RetryRestrictionCheck() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function retry() {
    setBusy(true);
    setMessage('');
    const supabase = createClient();
    const { data: restriction, error: restrictionError } = await supabase.rpc('my_restriction');
    const { data: warnings, error: warningError } = await supabase.rpc('my_unacknowledged_warnings');
    setBusy(false);
    if (restrictionError || warningError) {
      setMessage('The account status check is still unavailable. Please try again in a moment.');
    } else if (restriction || (Array.isArray(warnings) && warnings.length > 0)) {
      router.refresh();
    } else {
      router.replace('/');
      router.refresh();
    }
  }
  return <div className="restriction-actions"><button className="btn primary" disabled={busy} onClick={retry}>{busy ? 'Checking...' : 'Retry status check'}</button>{message && <p role="status" className="note">{message}</p>}</div>;
}
