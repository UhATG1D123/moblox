'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const OPTS = [{ v: 'everyone', l: 'Everyone' }, { v: 'friends', l: 'Friends only' }, { v: 'nobody', l: 'Only me' }];

export default function ProfileSettings({ displayName, bio, privacy }) {
  const router = useRouter();
  const [dn, setDn] = useState(displayName || '');
  const [b, setB] = useState(bio || '');
  const [pv, setPv] = useState({
    friends: privacy?.friends || 'everyone',
    inventory: privacy?.inventory || 'everyone',
    online: privacy?.online || 'everyone',
  });
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const { error } = await createClient().rpc('update_my_profile', { p_display_name: dn, p_bio: b, p_privacy: pv });
    setBusy(false);
    if (error) {
      setOk(false);
      setMsg(/check constraint/i.test(error.message) ? 'Display name must be 1-30 characters and your bio 500 or fewer.' : error.message);
      return;
    }
    setOk(true); setMsg('Profile saved.'); router.refresh();
  }
  const sel = (key, label) => (
    <label><span>{label}</span>
      <select value={pv[key]} onChange={(e) => setPv({ ...pv, [key]: e.target.value })}>
        {OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
  return (
    <form onSubmit={save} className="aform">
      <h3>Edit profile</h3>
      <label><span>Display name</span><input value={dn} onChange={(e) => setDn(e.target.value)} maxLength={30} placeholder="Shown instead of your username" /></label>
      <label><span>Bio ({b.length}/500)</span><textarea value={b} onChange={(e) => setB(e.target.value)} maxLength={500} /></label>
      <h3>Privacy</h3>
      {sel('friends', 'Who can see my friends list')}
      {sel('inventory', 'Who can see my inventory')}
      {sel('online', 'Who can see when I was last online')}
      <button className="btn primary" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
      {msg && <p className={ok ? 'ok' : 'note'}>{msg}</p>}
    </form>
  );
}
