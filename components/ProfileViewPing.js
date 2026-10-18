'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ProfileViewPing({ id }) {
  useEffect(() => {
    try {
      const key = `pv:${id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    createClient().rpc('record_profile_view', { p_id: id }).then(() => {});
  }, [id]);
  return null;
}
