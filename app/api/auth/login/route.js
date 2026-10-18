import { NextResponse } from 'next/server';

export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Username login is not configured yet.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter your username and password.' }, { status: 400 });
  }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username) || !password || password.length > 1024) {
    return NextResponse.json({ error: 'Unable to log in. Check your username and password.' }, { status: 400 });
  }

  try {
    const profileResponse = await fetch(`${url}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=auth_id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: 'no-store',
    });
    if (!profileResponse.ok) throw new Error('Username lookup failed');
    const profiles = await profileResponse.json();
    if (!profiles.length) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });

    const userResponse = await fetch(`${url}/auth/v1/admin/users/${profiles[0].auth_id}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: 'no-store',
    });
    if (!userResponse.ok) throw new Error('Account lookup failed');
    const user = await userResponse.json();
    if (!user.email) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });

    const loginResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password }),
      cache: 'no-store',
    });
    const session = await loginResponse.json().catch(() => ({}));
    if (!loginResponse.ok) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    return NextResponse.json({ access_token: session.access_token, refresh_token: session.refresh_token });
  } catch {
    return NextResponse.json({ error: 'Unable to log in right now. Please try again.' }, { status: 500 });
  }
}
