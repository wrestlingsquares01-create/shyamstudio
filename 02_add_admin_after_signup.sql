-- First create a real Supabase Auth email/password user for yourself.
-- Then replace the placeholder with its UID from Authentication > Users.
-- This is SQL Editor ONLY; never run this in browser JS or upload to public hosting.
INSERT INTO public.studio_admins (user_id)
VALUES ('PASTE_YOUR_ADMIN_AUTH_UID_HERE'::uuid)
ON CONFLICT (user_id) DO NOTHING;
