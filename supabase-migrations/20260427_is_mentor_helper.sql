-- Migration: helper public.is_mentor() pra usar em policies RLS
-- Data: 2026-04-27
-- Identifica admin/mentor server-side, sem depender do front.

CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM mentores m
    WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_mentor() TO authenticated;
