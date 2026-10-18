'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    router.push('/'); router.refresh();
  }
  return (
    <form onSubmit={submit} className="authbox">
      <h1>Log in to Moblox</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="btn buy" disabled={busy}>{busy ? 'Logging in...' : 'Log In'}</button>
      {msg && <p className="note">{msg}</p>}
      <p className="muted"><Link href="/forgot-password">Forgot your password?</Link></p>
      <p className="muted">No account? <Link href="/signup">Sign up</Link></p>
    </form>
  );
}
