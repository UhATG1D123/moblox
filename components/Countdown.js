'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const pad = (n) => String(n).padStart(2, '0');
function format(seconds) {
  const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60), secs = seconds % 60;
  return `${days ? `${days}d ` : ''}${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}
export default function Countdown({ expiresAt, serverNow }) {
  const router = useRouter();
  const end = expiresAt ? new Date(expiresAt).getTime() : null;
  const [offset] = useState(() => new Date(serverNow || Date.now()).getTime() - Date.now());
  const [left, setLeft] = useState(() => end === null ? null : Math.max(0, Math.ceil((end - (Date.now() + offset)) / 1000)));
  useEffect(() => {
    if (end === null) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((end - (Date.now() + offset)) / 1000)));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [end, offset]);
  const finished = left === 0;
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      const { data, error } = await createClient().rpc('my_restriction');
      if (stopped || error) return;
      if (!data) { router.replace('/'); router.refresh(); }
      else if ((data.expires_at || null) !== (expiresAt || null)) router.refresh();
    };
    if (finished) check();
    const timer = setInterval(check, finished ? 3000 : 60000);
    return () => { stopped = true; clearInterval(timer); };
  }, [finished, expiresAt, router]);
  if (end === null) return null;
  return <div className="countdown" role="timer" aria-live="off"><span className="countdown-label">{finished ? 'Checking account access…' : 'Time remaining'}</span><b>{format(left ?? 0)}</b></div>;
}
