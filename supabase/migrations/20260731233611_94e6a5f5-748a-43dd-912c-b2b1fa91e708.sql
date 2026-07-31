-- 1. candidate_agents: remove blanket public SELECT; keep safe view + own-rows access
DROP POLICY IF EXISTS "Candidate agents readable by everyone (column-restricted)" ON public.candidate_agents;

CREATE POLICY "Users can view own candidate submissions"
ON public.candidate_agents
FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

REVOKE SELECT ON public.candidate_agents FROM anon;
GRANT SELECT ON public.candidate_agents TO authenticated;
GRANT INSERT ON public.candidate_agents TO authenticated;
GRANT ALL ON public.candidate_agents TO service_role;

-- safe public view stays readable
GRANT SELECT ON public.candidate_agents_public TO anon, authenticated;

-- 2. indexer_runs: drop authenticated read of raw rows (incl. internal notes)
DROP POLICY IF EXISTS "Indexer runs visible to authenticated users" ON public.indexer_runs;
REVOKE SELECT ON public.indexer_runs FROM anon, authenticated;
GRANT ALL ON public.indexer_runs TO service_role;

CREATE OR REPLACE VIEW public.indexer_runs_public
WITH (security_invoker = off) AS
SELECT id, worker, ok, ran_at, duration_ms
FROM public.indexer_runs;

GRANT SELECT ON public.indexer_runs_public TO anon, authenticated;