import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverClient } from '@/lib/supabase/server';

const invalidCredentials = () =>
  NextResponse.json({ error: 'Invalid username/email or password.' }, { status: 401 });

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identifier || !password || identifier.length > 254 || password.length > 1024) {
    return NextResponse.json({ error: 'Enter your username/email and password.' }, { status: 400 });
  }

  let email = identifier;

  if (!identifier.includes('@')) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Username login is temporarily unavailable. Please try your email address.' }, { status: 503 });
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.rpc('lookup_login_email', {
      p_username: identifier,
    });

    if (error || typeof data !== 'string' || !data) return invalidCredentials();
    email = data;
  }

  const supabase = serverClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return invalidCredentials();

  return NextResponse.json({ success: true });
}
