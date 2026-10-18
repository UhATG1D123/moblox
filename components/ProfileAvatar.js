'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ProfileAvatar({ userId, username, className = 'av sm' }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    async function load() {
      const sb = createClient();
      const { data, error } = await sb.rpc('get_public_profile', { p_id: userId });
      if (!active || error || !data?.avatar_path) return;
      const { data: signed } = await sb.storage.from('profile-photos').createSignedUrl(data.avatar_path, 3600);
      if (active) setUrl(signed?.signedUrl || null);
    }
    if (userId) load();
    return () => { active = false; };
  }, [userId]);
  return <span className={className}>{url ? <img src={url} alt={username + ' profile picture'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : username?.[0]?.toUpperCase() || '?'}</span>;
}