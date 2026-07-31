CREATE OR REPLACE VIEW public.indexer_runs_public
WITH (security_invoker = on) AS
SELECT id, worker, ok, ran_at, duration_ms
FROM public.indexer_runs;

-- Column-level grants keep `notes` private while allowing the view to work
-- under the caller's own permissions.
GRANT SELECT (id, worker, ok, ran_at, duration_ms) ON public.indexer_runs TO anon, authenticated;

CREATE POLICY "Indexer run summaries are publicly readable"
ON public.indexer_runs
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.indexer_runs_public TO anon, authenticated;