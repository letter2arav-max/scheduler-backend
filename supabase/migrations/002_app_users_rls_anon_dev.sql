-- Enables RLS and allows anon (mobile app) to read/write `users` for development.
-- Replace with auth-scoped policies (e.g. auth.uid() = id) before production.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_anon_all_dev" ON public.users;

CREATE POLICY "users_anon_all_dev"
  ON public.users
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Authenticated Supabase users (if you add Auth later)
DROP POLICY IF EXISTS "users_authenticated_all_dev" ON public.users;

CREATE POLICY "users_authenticated_all_dev"
  ON public.users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
