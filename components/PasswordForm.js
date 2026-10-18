'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function PasswordForm() {
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  async function save(e) {
    e.preventDefault();
    if (pw.length < 8) { setMsg('Use at least 8 characters.'); return; }
    const { error } = await createClient().auth.updateUser({ password: pw });
    setMsg(error ? error.message : 'Password updated.');
    if (!error) setPw('');
  }
  return (
    <form onSubmit={save} className="aform">
      <h3>Change password</h3>
      <label><span>New password</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required /></label>
      <button className="btn primary">Update password</button>
      {msg && <p className="note">{msg}</p>}
    </form>
  );
}
