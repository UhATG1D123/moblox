'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AcknowledgeWarnings({ warnings }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function acknowledgeAll() {
    setBusy(true);
    setMessage('');
    const supabase = createClient();

    for (const warning of warnings) {
      const { error } = await supabase.rpc('acknowledge_warning', { p_warning: warning.id });
      if (error) {
        setBusy(false);
        setMessage('We couldn’t save your acknowledgment. Please retry.');
        return;
      }
    }

    setBusy(false);
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="restriction-card">
      <p className="eyebrow">Moblox moderation</p>
      <h1>Warning Notice</h1>
      <p>Our moderation team issued {warnings.length === 1 ? 'a warning for your account' : 'warnings for your account'}. Please review {warnings.length === 1 ? 'the notice' : 'each notice'} below and acknowledge {warnings.length === 1 ? 'it' : 'them'} to continue using Moblox.</p>
      <div className="restriction-details">
        {warnings.map((warning) => (
          <div key={warning.id}>
            <dt>Warning · {new Date(warning.created_at).toLocaleString()}</dt>
            <dd>{warning.reason || 'No reason was provided.'}</dd>
          </div>
        ))}
      </div>
      <p>Warnings do not automatically mean your account is banned. Further moderation may occur if rules continue to be broken.</p>
      <button className="btn primary" disabled={busy} onClick={acknowledgeAll}>{busy ? 'Saving acknowledgment…' : 'Acknowledge and continue'}</button>
      {message && <p className="note" role="alert">{message}</p>}
      <form action="/auth/signout" method="post"><button className="btn" type="submit">Log out</button></form>
    </div>
  );
}
