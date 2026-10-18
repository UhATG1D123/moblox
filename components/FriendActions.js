'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function FriendActions({ userId, relationship, requestId, loggedIn }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');

  if (relationship === 'self') return null;
  if (!loggedIn) return <div className="actions"><Link className="btn primary" href="/login">Log in to add friends</Link></div>;

  async function run(fn, args, done) {
    setBusy(true); setMsg('');
    const { error } = await createClient().rpc(fn, args);
    setBusy(false);
    if (error) { setMsg(error.message); return false; }
    if (done) setMsg(done);
    router.refresh();
    return true;
  }
  async function block() {
    if (!window.confirm('Block this user? You will stop being friends and they cannot send you requests.')) return;
    await run('block_user', { p_target: userId });
  }
  async function remove() {
    if (!window.confirm('Remove this friend?')) return;
    await run('remove_friend', { p_target: userId });
  }
  async function report() {
    const ok = await run('report_user', { p_target: userId, p_reason: reason }, 'Report sent. Thank you.');
    if (ok) { setReporting(false); setReason(''); }
  }

  return (
    <div className="actions">
      {relationship === 'none' && <button className="btn primary" disabled={busy} onClick={() => run('send_friend_request', { p_target: userId })}>Add friend</button>}
      {relationship === 'request_sent' && <button className="btn" disabled={busy} onClick={() => run('cancel_friend_request', { p_request: requestId })}>Cancel request</button>}
      {relationship === 'request_received' && (
        <>
          <button className="btn primary" disabled={busy} onClick={() => run('respond_friend_request', { p_request: requestId, p_accept: true })}>Accept</button>
          <button className="btn" disabled={busy} onClick={() => run('respond_friend_request', { p_request: requestId, p_accept: false })}>Decline</button>
        </>
      )}
      {relationship === 'friends' && <button className="btn" disabled={busy} onClick={remove}>Remove friend</button>}
      {relationship === 'blocked'
        ? <button className="btn" disabled={busy} onClick={() => run('unblock_user', { p_target: userId })}>Unblock</button>
        : <button className="btn" disabled={busy} onClick={block}>Block</button>}
      <button className="btn" onClick={() => setReporting(!reporting)}>Report</button>
      {reporting && (
        <div className="reportbox">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What is wrong with this account?" maxLength={500} />
          <button className="btn danger" disabled={busy} onClick={report}>Send report</button>
        </div>
      )}
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}
