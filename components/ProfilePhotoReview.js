'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProfilePhotoReview({ requests }) {
  const [busy, setBusy] = useState(0);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function review(id, approve) {
    const note = approve ? 'Approved by staff' : (window.prompt('Reason for rejecting this picture?') || '');
    if (!approve && !note.trim()) return;
    setBusy(id);
    setMessage('');
    const { error } = await createClient().rpc('admin_review_profile_photo', { p_request: id, p_approve: approve, p_note: note });
    setBusy(0);
    if (error) setMessage('Review failed: ' + error.message);
    else { setMessage('Review saved.'); router.refresh(); }
  }

  if (!requests.length) return <p className="muted">No profile pictures are waiting for review.</p>;
  return <div className="forms">
    {requests.map(r => <div className="panel" key={r.id}>
      <h3>Request #{r.id} — @{r.username} (User {r.profile_id})</h3>
      <p className="muted">Submitted {new Date(r.created_at).toLocaleString()}</p>
      {r.image_url && <img src={r.image_url} alt={"Pending picture for " + r.username} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />}
      <div className="chips">
        <button className="btn primary" disabled={!!busy} onClick={() => review(r.id, true)}>{busy === r.id ? 'Working...' : 'Approve'}</button>
        <button className="btn" disabled={!!busy} onClick={() => review(r.id, false)}>Reject</button>
      </div>
    </div>)}
    {message && <p className="note" role="status">{message}</p>}
  </div>;
}
