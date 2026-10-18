import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';

export async function POST(request) {
  await serverClient().auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
