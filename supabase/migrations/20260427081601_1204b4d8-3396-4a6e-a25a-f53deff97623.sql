-- 1. Restrict profiles SELECT to owner only.
-- The existing public_profiles view (display_name, avatar_url, id) remains
-- the public-safe surface; operator_wallet stays owner-private.
DROP POLICY IF EXISTS "Public can read profile rows" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Revoke EXECUTE on internal trigger functions from anon/authenticated.
-- These are invoked by triggers (which run with table owner privileges),
-- not by clients via PostgREST. enqueue_candidate_agent is intentionally
-- callable and remains executable.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_operator_challenge_update() FROM PUBLIC, anon, authenticated;

-- 3. Constrain operator_challenges to one open (unsigned) challenge per
-- (user_id, mint) — prevents enumeration / table flooding while still
-- allowing the legitimate verify flow to issue a fresh nonce.
CREATE UNIQUE INDEX IF NOT EXISTS operator_challenges_open_unique
ON public.operator_challenges (user_id, mint)
WHERE signature IS NULL;