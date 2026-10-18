'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const sb = createClient();
    let error;
    if (identifier.includes('@')) {
      ({ error } = await sb.auth.signInWithPassword({ email: identifier.trim(), password }));
    } else {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier.trim(), password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        error = { message: result.error || 'Unable to log in. Check your username and password.' };
      } else {
        ({ error } = await sb.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        }));
      }
    }
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="authbox">
      <h1>Log in to Moblox</h1>
      <input autoComplete="username" placeholder="Username or Email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
      <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="btn buy" disabled={busy}>{busy ? 'Logging in...' : 'Log In'}</button>
      {msg && <p className="note">{msg}</p>}
      <p className="muted"><Link href="/forgot-password">Forgot your password?</Link></p>
      <p className="muted">No account? <Link href="/signup">Sign up</Link></p>
    </form>
  );
}
