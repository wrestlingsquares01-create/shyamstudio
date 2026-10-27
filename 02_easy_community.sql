-- THE STUDIO — EASY CIRCLE LOGIN (run AFTER 01_database.sql)
-- Enable Anonymous Sign-ins in Supabase -> Authentication -> Providers BEFORE using the page.
-- This flow is convenient, but a shared invite word and name do NOT establish real identity.
-- Anyone who knows the invite word can claim one of these five names.

CREATE OR REPLACE FUNCTION public.join_studio_circle(p_name text, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := lower(btrim(coalesce(p_name, '')));
  v_existing_name text;
  v_active boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in before joining.' USING ERRCODE = '28000';
  END IF;
  IF lower(btrim(coalesce(p_code, ''))) <> 'bachyo' THEN
    RAISE EXCEPTION 'Invalid invite word.' USING ERRCODE = '28000';
  END IF;
  IF v_name NOT IN ('ravi', 'nuks', 'priyanshu', 'shyam', 'prashant') THEN
    RAISE EXCEPTION 'This name is not on the guest list.' USING ERRCODE = '22023';
  END IF;

  SELECT m.display_name, m.active
  INTO v_existing_name, v_active
  FROM public.studio_members AS m
  WHERE m.user_id = v_uid;

  IF FOUND THEN
    IF v_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'This device account is not active.' USING ERRCODE = '28000';
    END IF;
    IF lower(v_existing_name) <> v_name THEN
      RAISE EXCEPTION 'This session already uses another name.' USING ERRCODE = '28000';
    END IF;
    RETURN;
  END IF;

  INSERT INTO public.studio_members (user_id, display_name, active)
  VALUES (v_uid, initcap(v_name), true)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.join_studio_circle(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_studio_circle(text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_studio_circle(text,text) TO authenticated;
