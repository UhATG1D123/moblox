'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function Signup() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) { setMsg('Username must be 3-20 letters, numbers or underscores.'); return; }
    if (password.length < 8) { setMsg('Password must be at least 8 characters.'); return; }
    setBusy(true);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/verified`,
      },
    });
    setBusy(false);
    if (error) {
      setMsg(/database error/i.test(error.message) ? 'That username is taken or not allowed. Try another.' : error.message);
      return;
    }
    if (data.session) { router.push('/'); router.refresh(); }
    else setMsg('Account created. Check your email to confirm it, then return to Moblox. You will see “Account Verified” when confirmation succeeds.');
  }
  return (
    <form onSubmit={submit} className="authbox">
      <h1>Sign up for Moblox</h1>
      <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} required />
      <input type="email" placeholder="Email (private)" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="btn buy" disabled={busy}>{busy ? 'Creating...' : 'Sign Up'}</button>
      {msg && <p className="note">{msg}</p>}
      <p className="muted">New accounts start with 100 MoBux. Already have one? <Link href="/login">Log in</Link></p>
    </form>
  );
}
