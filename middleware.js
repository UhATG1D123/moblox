import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const ALLOWED = ['/not-approved', '/auth/signout', '/auth/callback'];
const allowed = (path) => ALLOWED.some((p) => path === p || path.startsWith(`${p}/`));

export async function middleware(request) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !allowed(request.nextUrl.pathname)) {
    const { data, error } = await supabase.rpc('my_restriction');
    // Fail closed if the restriction check cannot be verified. Apply migration 004 before deploying.
    const blocked = !!data || !!error;
    if (blocked) {
      const redirect = NextResponse.redirect(new URL('/not-approved', request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|glb|fbx)$).*)'] };
