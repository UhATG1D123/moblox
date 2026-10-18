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

## Report email notifications

User and catalog-item reports are still recorded in Supabase and also send a Roblox-style report notification to `latpalex@gmail.com`.

1. Create a Resend account at https://resend.com and create an API key.
2. Add `RESEND_API_KEY` to Vercel's **Project → Settings → Environment Variables** for Production (and Preview if desired).
3. Verify `moblox.xyz` in Resend and add the DNS records Resend gives you to Namecheap. Keep the existing Vercel website records intact.
4. Add `MOBLOX_REPORTS_FROM` in Vercel with a verified sender such as `Moblox Reports <reports@moblox.xyz>`.
5. Redeploy the project after saving the environment variables.

The code temporarily defaults to Resend's `onboarding@resend.dev` sender if `MOBLOX_REPORTS_FROM` is blank. For reliable production delivery, verify your domain and use your own sender. If the email provider is not configured or rejects delivery, the report remains saved in the Admin dashboard and the user sees that the email notification did not send.
