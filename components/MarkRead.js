'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MarkRead() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(async () => {
      const { error } = await createClient().rpc('mark_notifications_read');
      if (!error) router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
