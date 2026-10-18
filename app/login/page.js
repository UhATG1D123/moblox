'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMsg(result.error || 'Unable to log in. Please try again.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setMsg('Unable to log in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="authbox">
      <h1>Log in to Moblox</h1>
      <input
        type="text"
        placeholder="Username or Email"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        autoComplete="username"
        maxLength={254}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      <button className="btn buy" disabled={busy}>{busy ? 'Logging in...' : 'Log In'}</button>
      {msg && <p className="note">{msg}</p>}
      <p className="muted"><Link href="/forgot-password">Forgot your password?</Link></p>
      <p className="muted">No account? <Link href="/signup">Sign up</Link></p>
    </form>
  );
}
