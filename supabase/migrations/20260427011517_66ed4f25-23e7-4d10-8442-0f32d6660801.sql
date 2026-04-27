-- 1. Move pg_net out of the public schema (drop + recreate in extensions schema).
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 2. profiles: stop exposing operator_wallet to anonymous public.
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;

CREATE POLICY "Public can read profile rows"
  ON public.profiles FOR SELECT
  USING (true);

-- Column-level grants: anon + authenticated can only SELECT safe columns
-- on the profiles table. operator_wallet is owner-only via a view check.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

-- Public-facing view for app code that needs profile info.
CREATE OR REPLACE VIEW public.public_profiles
  WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Owner-only view that includes operator_wallet.
CREATE OR REPLACE VIEW public.my_profile
  WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url, operator_wallet, created_at, updated_at
FROM public.profiles
WHERE id = auth.uid();
GRANT SELECT ON public.my_profile TO authenticated;

-- 3. candidate_agents: hide internal review fields (notes, submitted_by)
--    from public reads.
REVOKE SELECT ON public.candidate_agents FROM anon, authenticated;
GRANT SELECT (
  id, mint, status, discovered_via, signals, check_attempts,
  last_checked_at, rejection_reason, created_at, updated_at
) ON public.candidate_agents TO anon, authenticated;

-- 4. operator_challenges: add explicit WITH CHECK to UPDATE policy.
DROP POLICY IF EXISTS "Users can update own operator challenges" ON public.operator_challenges;
CREATE POLICY "Users can update own operator challenges"
  ON public.operator_challenges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);