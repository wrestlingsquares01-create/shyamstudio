# THE STUDIO — 5-name Community Entry

## Intended flow
1. On index.html, type `bachyo` and Continue.
2. On community.html, enter ONE of: Ravi, Nuks, Priyanshu, Shyam, Prashant.
3. The site creates an anonymous Supabase Auth session in the background, verifies the shared word server-side, registers the name, and loads the realtime text chat.

No email or password entry is required for friends. Admin email/password remains unchanged.

## Supabase setup (required)
1. Supabase Dashboard -> Authentication -> Providers -> Anonymous Sign-ins -> Enable. This may appear under Authentication -> Sign In / Providers depending on dashboard version.
2. SQL Editor -> New Query -> paste all of `backend/02_easy_community.sql` -> Run. Run the existing `backend/01_database.sql` first if it wasn't already run.
3. Keep `config.js` filled with ONLY the Project URL and publishable/anon key (not service_role).
4. Replace your old `community.html` and `script.js` with the files in this package. All other pages keep the same design.
5. Open `index.html`, enter `bachyo`, then enter one of the five permitted names.

## Privacy and limitations
- Anyone who learns `bachyo` can claim any of those 5 names. This is not proof of identity and is NOT secure against impersonation.
- Only code + authenticated anonymous sessions with database membership can read/write through the existing Supabase RLS policies. The invite word is shared, so treat the chat as a casual group, not highly sensitive.
- Enable rate limiting / CAPTCHA or stronger per-member credentials before a public launch. Supabase anonymous sign-ins can be abused by bots.
- Do not put private project keys or service_role keys into frontend.
- Photo and audio uploads remain local previews until a properly secured Storage setup is added.
- Other pages and admin login are preserved.
