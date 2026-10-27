-- THE STUDIO / Supabase Database V1
-- Run ONCE in a NEW, dedicated Supabase project using SQL Editor.
-- Includes website enquiries, authorized admins, members and realtime text chat.
-- Does not activate guest invite redemption or media uploads.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS public.studio_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.studio_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 100),
  contact_email text NOT NULL CHECK (
    char_length(contact_email) BETWEEN 5 AND 254
    AND contact_email LIKE '%@%.%'
  ),
  website_type text NOT NULL CHECK (char_length(btrim(website_type)) BETWEEN 2 AND 100),
  budget text NOT NULL DEFAULT 'Not decided' CHECK (char_length(budget) BETWEEN 1 AND 100),
  requirements text NOT NULL CHECK (char_length(btrim(requirements)) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewing', 'accepted', 'in_progress', 'completed', 'rejected'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS studio_orders_created_idx ON public.studio_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS studio_orders_status_idx ON public.studio_orders (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.studio_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 40),
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.studio_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.studio_members(user_id),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_messages_created_idx ON public.studio_messages(created_at DESC);

-- Internal helpers; private schema MUST NOT be listed in Supabase API Exposed schemas.
CREATE OR REPLACE FUNCTION private.is_studio_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (select auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.studio_admins a WHERE a.user_id = (select auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.is_studio_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (select auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.studio_members m
    WHERE m.user_id = (select auth.uid()) AND m.active = true
  );
$$;
REVOKE ALL ON FUNCTION private.is_studio_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_studio_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_studio_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_studio_member() TO authenticated;

ALTER TABLE public.studio_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_messages ENABLE ROW LEVEL SECURITY;

-- Privilege grants and RLS BOTH matter. No service_role key in browser.
REVOKE ALL ON public.studio_admins FROM anon, authenticated;
REVOKE ALL ON public.studio_orders FROM anon, authenticated;
REVOKE ALL ON public.studio_members FROM anon, authenticated;
REVOKE ALL ON public.studio_messages FROM anon, authenticated;
GRANT SELECT ON public.studio_admins TO authenticated;
GRANT INSERT (customer_name, contact_email, website_type, budget, requirements)
  ON public.studio_orders TO anon, authenticated;
GRANT SELECT, UPDATE (status) ON public.studio_orders TO authenticated;
GRANT SELECT ON public.studio_members TO authenticated;
GRANT SELECT, INSERT (sender_id, body), DELETE ON public.studio_messages TO authenticated;

DROP POLICY IF EXISTS "studio admin reads own record" ON public.studio_admins;
CREATE POLICY "studio admin reads own record"
ON public.studio_admins FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- Public enquiries: allowed to send, never to read or edit other people's details.
DROP POLICY IF EXISTS "website visitors submit enquiries" ON public.studio_orders;
CREATE POLICY "website visitors submit enquiries"
ON public.studio_orders FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "verified admin reads enquiries" ON public.studio_orders;
CREATE POLICY "verified admin reads enquiries"
ON public.studio_orders FOR SELECT TO authenticated
USING ((select private.is_studio_admin()));

DROP POLICY IF EXISTS "verified admin changes enquiry status" ON public.studio_orders;
CREATE POLICY "verified admin changes enquiry status"
ON public.studio_orders FOR UPDATE TO authenticated
USING ((select private.is_studio_admin()))
WITH CHECK ((select private.is_studio_admin()));

DROP POLICY IF EXISTS "approved members see member directory" ON public.studio_members;
CREATE POLICY "approved members see member directory"
ON public.studio_members FOR SELECT TO authenticated
USING ((select private.is_studio_member()) OR (select private.is_studio_admin()));

DROP POLICY IF EXISTS "approved members read chat" ON public.studio_messages;
CREATE POLICY "approved members read chat"
ON public.studio_messages FOR SELECT TO authenticated
USING ((select private.is_studio_member()));

DROP POLICY IF EXISTS "approved members send as themselves" ON public.studio_messages;
CREATE POLICY "approved members send as themselves"
ON public.studio_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = (select auth.uid()) AND (select private.is_studio_member()));

DROP POLICY IF EXISTS "sender deletes own message" ON public.studio_messages;
CREATE POLICY "sender deletes own message"
ON public.studio_messages FOR DELETE TO authenticated
USING (sender_id = (select auth.uid()) AND (select private.is_studio_member()));

-- Enable Realtime Postgres Changes for text chat, idempotently.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='studio_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.studio_messages;
  END IF;
END $$;
