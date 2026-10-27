-- For a friend who already has a Supabase Auth UID.
-- Change display_name and UUID per person.
-- Requires manual approval until a secure invite-redemption endpoint is implemented.
INSERT INTO public.studio_members (user_id, display_name, active)
VALUES ('PASTE_FRIEND_AUTH_UID_HERE'::uuid, 'FRIEND NAME', true)
ON CONFLICT (user_id)
DO UPDATE SET display_name = EXCLUDED.display_name, active = true;
