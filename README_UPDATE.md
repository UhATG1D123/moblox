# Moblox update: profiles, friends, notifications, badges, admin tools

1. Supabase > SQL Editor: run supabase/003_profiles_social.sql (safe to re-run).
2. Copy these folders over your project (app/, components/, supabase/). Files with the same name are replaced.
   Replaced: app/layout.js, app/globals.css, app/admin/page.js, app/login/page.js, app/settings/page.js,
   app/users/[id]/profile/page.js, components/Topbar.js, components/Sidebar.js.
3. Supabase > Authentication > URL Configuration: add <your site URL>/auth/callback to Redirect URLs (needed for password reset emails).
4. Staff can grant badges only if their role permissions include manage_badges. The owner ('*') always can.
