'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setDone(true);
  }
  if (done) {
    return (
      <div className="authbox">
        <h1>Check your email</h1>
        <p>If an account exists for {email}, we sent a link to reset the password. The link expires after a short time.</p>
        <p className="muted"><Link href="/login">Back to log in</Link></p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="authbox">
      <h1>Reset your password</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button className="btn buy" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
      {msg && <p className="note">{msg}</p>}
      <p className="muted"><Link href="/login">Back to log in</Link></p>
    </form>
  );
}
