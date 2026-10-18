'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProfilePhotoUpload({ profileId, pending }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(pending ? 'Your picture is awaiting admin review.' : '');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    if (!file) return setMessage('Choose a PNG image first.');
    if (file.type !== 'image/png' || !file.name.toLowerCase().endsWith('.png')) return setMessage('Only PNG images are allowed.');
    if (file.size > 2 * 1024 * 1024) return setMessage('The image must be 2 MB or smaller.');
    setBusy(true);
    setMessage('');
    const sb = createClient();
    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) {
      setBusy(false);
      return setMessage('Please sign in again and retry.');
    }
    const path = user.id + '/' + crypto.randomUUID() + '.png';
    const { error: uploadError } = await sb.storage.from('profile-photos').upload(path, file, { contentType: 'image/png', upsert: false });
    if (uploadError) {
      setBusy(false);
      return setMessage('Upload failed: ' + uploadError.message);
    }
    const { error } = await sb.from('profile_photo_requests').insert({ profile_id: profileId, storage_path: path });
    if (error) {
      await sb.storage.from('profile-photos').remove([path]);
      setBusy(false);
      return setMessage('Could not submit for review: ' + error.message);
    }
    setBusy(false);
    setFile(null);
    setMessage('Picture submitted! It will appear after an admin approves it.');
    router.refresh();
  }

  return <form className="aform" onSubmit={submit}>
    <h3>Profile picture</h3>
    <p className="muted">Upload a PNG (2 MB maximum). New pictures stay private until an admin approves them.</p>
    <label><span>Choose PNG image</span><input type="file" accept="image/png,.png" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
    <button className="btn primary" disabled={busy || !!pending}>{busy ? 'Uploading...' : pending ? 'Awaiting review' : 'Submit for review'}</button>
    {message && <p className="note" role="status">{message}</p>}
  </form>;
}
