'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WarningAcknowledgment({ warningId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function acknowledge() {
    setBusy(true);
    setMessage('');
    const { error } = await createClient().rpc('acknowledge_warning', { p_warning: warningId });
    setBusy(false);
    if (error) {
      setMessage('We could not acknowledge this warning. Please try again.');
      return;
    }
    router.refresh();
  }

  return <div className="actions"><button className="btn primary" type="button" disabled={busy} onClick={acknowledge}>{busy ? 'Acknowledging…' : 'I acknowledge this warning'}</button>{message && <p className="note" role="status">{message}</p>}</div>;
}
