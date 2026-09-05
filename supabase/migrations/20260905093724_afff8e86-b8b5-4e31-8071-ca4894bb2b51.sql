CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, window_start)
);

GRANT ALL ON public.rate_limit_counters TO service_role;

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS rate_limit_counters_window_idx
  ON public.rate_limit_counters (window_start);

CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_bucket text,
  p_window_seconds integer,
  p_limit integer
)
RETURNS TABLE (allowed boolean, hits integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_hits integer;
BEGIN
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limit_counters (bucket, window_start, hits, updated_at)
  VALUES (p_bucket, v_window_start, 1, now())
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET hits = public.rate_limit_counters.hits + 1, updated_at = now()
  RETURNING public.rate_limit_counters.hits INTO v_hits;

  -- Opportunistic cleanup of stale windows (cheap, bounded).
  DELETE FROM public.rate_limit_counters
  WHERE window_start < now() - interval '1 hour';

  RETURN QUERY SELECT (v_hits <= p_limit), v_hits, v_window_start + make_interval(secs => p_window_seconds);
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) TO service_role;