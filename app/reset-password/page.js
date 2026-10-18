'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPassword() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) { setMsg('Use at least 8 characters.'); return; }
    setBusy(true); setMsg('');
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    router.push('/'); router.refresh();
  }
  return (
    <form onSubmit={submit} className="authbox">
      <h1>Choose a new password</h1>
      <input type="password" placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
      <button className="btn buy" disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
      {msg && <p className="note">{msg}</p>}
      <p className="muted">If this page says you are not signed in, open the link from your email again. Links work once.</p>
    </form>
  );
}
