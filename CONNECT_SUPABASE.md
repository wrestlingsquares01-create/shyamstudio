# THE STUDIO — Connect Supabase (Frontend V2)

You have already run the database SQL and assigned your admin role. Do not rerun the full database setup unnecessarily.

## One required edit

Open `config.js`. Replace only `PASTE_SUPABASE_PROJECT_URL` and `PASTE_SUPABASE_PUBLISHABLE_KEY` with your **Project URL** and **public publishable key** from Supabase Dashboard → Project Settings → API Keys (or Connect). The CDN loads Supabase JS v2. **Never** paste service_role, sb_secret, database password or account password.

## Then

1. Extract this ZIP and run a local web server (VS Code Live Server).
2. Open `portfolio.html`: fill enquiry, submit. Check `studio_orders` in Supabase Table Editor. This no-signup form is a request, not a payment checkout.
3. Open `admin.html`: sign in with your approved admin **email and password**. The dashboard loads enquiries and lets you change status.
4. For community members, use **Authentication → Users** to create their accounts with their permission; in the SQL Editor (trusted dashboard) run:

```sql
INSERT INTO public.studio_members(user_id, display_name, active)
SELECT id, 'FRIEND', true FROM auth.users WHERE email = 'FRIEND_EMAIL_HERE'
ON CONFLICT (user_id) DO UPDATE SET active = true;
```

5. An approved member opens `community.html`, signs in and sees the last 100 messages with realtime updates. The entry name `bachyo` is just a navigation shortcut; it is not private-chat authorization.

## Current scope

- **LIVE with config**: public enquiry submission, secure approved-admin login and order status, approved-member chat text, private member directory, recent-message search.
- **LOCAL ONLY**: photo previews, notes. **Not included**: live photo/video/voice uploads, automatic invite redemption.
- An admin can read the common room only if also approved as `studio_members`. Tell members who can access their room.
- There is no need to make accounts for public portfolio visitors.

## Before public launch

Public INSERT is susceptible to spam. Add a proper rate-limited server-side form handler (or verified CAPTCHA with server-side validation); never rely solely on client checks. Run two-browser tests, verify permission denials for non-admins and unapproved members, confirm auth redirect URLs and HTTPS, and have parent/guardian assistance for commercial order handling and payments.
