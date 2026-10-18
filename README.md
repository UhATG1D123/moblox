# Moblox

Next.js + Supabase. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your environment (including Vercel).

## Database setup

For a fresh database, run these files in order in the Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/002_admin_and_views.sql`
3. `supabase/003_profiles_social.sql`
4. `supabase/004_moderation.sql`

If the first three have already been applied, run only `004_moderation.sql` before deploying this version. The site intentionally pauses signed-in access if it cannot verify restriction status, so apply the migration before deploying.

In Supabase, go to **Authentication → Sign In / Providers → Email** and turn **Confirm email** off only if you want instant sign-ups.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.
