# THE STUDIO — Supabase Backend Starter

This package preserves the premium frontend and prepares the backend. It does **not** falsely claim that the frontend is connected. No passwords or service-role keys belong in any public file.

## 1 — Create project

1. Open https://supabase.com/dashboard and sign in.
2. Choose **New project**, name it `the-studio` and select a nearby region.
3. Store the database password securely. Do not share it in chat.
4. When ready open **SQL Editor** and run `backend/01_database.sql` once.

## 2 — Configure Auth

- **Authentication → Providers**: enable **Email** for the administrator.
- Create/sign up **your own** admin email/password user; copy its user UID from **Authentication → Users**.
- In SQL Editor open `backend/02_add_admin_after_signup.sql`, substitute the UID, then Run.
- For name-only community chat, Supabase supports anonymous auth, but simply visiting `community.html` or typing `bachyo` is not authorization. An anonymous user must be explicitly approved or use a **properly secured** invite redemption service. Do not create a password in frontend JavaScript.

## 3 — Prepare Web API credentials

In **Project Settings → API** or the project's **Connect** panel copy:

- **Project URL** (https://...supabase.co)
- **Publishable** key (`sb_publishable_...`) or legacy anon key for supabase-js

The public frontend may contain these two values. **Never** expose `service_role`, secret API keys, the database password or user passwords.

Next, update the shared `script.js` using these two public values to turn the existing preview into real order submission, admin login and member chat. The current package has the *original* `script.js` unchanged.

## 4 — Database access model

- **studio_orders**: everyone can insert an enquiry; only verified admin can read and update order status. This is a *no-signup* flow. Public insert endpoints are susceptible to spam; add rate limiting/CAPTCHA or a server-side verified form endpoint **before public commercial launch**.
- **studio_admins**: created only through trusted SQL dashboard (or a future server-side function). Browser clients cannot grant themselves admin.
- **studio_members**: approved users, created only via trusted SQL or admin backend. Name entry / `bachyo` is not membership.
- **studio_messages**: approved signed-in members may read and post messages in realtime, and senders may delete their own messages.

The dedicated `private` SQL schema must not appear among the **Exposed schemas** in Supabase Data API settings. RLS is enabled for all new tables.

## 5 — Optional later stages

- Anonymous sign-ins + carefully authorized invite verification, if you want no email/password for friends. Anonymous sessions are device/browser-specific; clearing site data can lose an identity.
- Photos, voice and video require Supabase Storage with **private** buckets, RLS policies, appropriate file size/MIME limits and authorized upload access. A private bucket alone is not enough.
- Full mobile/browser tests, database privilege tests, safe admin order handling and deployment.

## 6 — Avoid this mistake

The existing `index.html`, `portfolio.html`, `admin.html`, `community.html`, `style.css` and `script.js` are a **frontend preview**. Running SQL alone does not make its demo buttons real. Supabase connection code must be integrated next. Do not send visitors to a live purchase workflow before checking submissions end-to-end.
