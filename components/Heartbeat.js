'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Heartbeat() {
  useEffect(() => {
    const ping = () => { createClient().rpc('touch_last_seen').then(() => {}); };
    ping();
    const t = setInterval(ping, 300000);
    return () => clearInterval(t);
  }, []);
  return null;
}
