'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function BuyPanel({ itemId, price, owned, loggedIn, balance }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  async function buy() {
    setBusy(true); setMsg('');
    const { error } = await createClient().rpc('purchase_item', { p_item_id: itemId });
    setBusy(false);
    if (error) setMsg(error.message); else router.refresh();
  }
  async function report() {
    setBusy(true);
    setMsg('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'item', targetId: itemId, reason }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMsg(result.error || 'Could not submit report.');
        return;
      }
      setMsg(result.message || 'Report sent. Thank you.');
      setOpen(false);
      setReason('');
    } catch {
      setMsg('Could not submit report. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!loggedIn) return <a className="btn buy" href="/login">Log in to buy</a>;
  return (
    <div>
      {owned ? <button className="btn buy" disabled>Owned</button>
        : <button className="btn buy" disabled={busy || balance < price} onClick={buy}>{busy ? 'Buying...' : 'Buy'}</button>}
      {!owned && balance < price && <p className="muted">Not enough MoBux.</p>}
      {msg && <p className="note">{msg}</p>}
      <p><button className="link" onClick={() => setOpen(!open)}>Report this item</button></p>
      {open && (
        <div className="reportbox">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong with it?" maxLength={500} />
          <button className="btn" disabled={busy || reason.trim().length < 3} onClick={report}>{busy ? 'Sending...' : 'Send report'}</button>
        </div>
      )}
    </div>
  );
}
