-- 1. Ensure scheduling + outbound http are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Prevent duplicate candidates by mint
CREATE UNIQUE INDEX IF NOT EXISTS candidate_agents_mint_key ON public.candidate_agents (mint);

-- 3. Public RPC that lets any visitor queue a mint they searched for.
--    SECURITY DEFINER so anon role can insert despite the strict
--    "manual_submit + auth.uid()" RLS policy. We strictly validate the input
--    shape and force discovered_via='search_lookup'.
CREATE OR REPLACE FUNCTION public.enqueue_candidate_agent(p_mint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mint text;
  v_existing record;
BEGIN
  v_mint := trim(p_mint);
  IF v_mint IS NULL OR length(v_mint) < 32 OR length(v_mint) > 44 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_mint');
  END IF;
  -- Loose base58 sanity check
  IF v_mint !~ '^[1-9A-HJ-NP-Za-km-z]+$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_mint');
  END IF;

  -- If it's already an agent, do nothing
  IF EXISTS (SELECT 1 FROM public.agents WHERE mint = v_mint) THEN
    RETURN jsonb_build_object('ok', true, 'status', 'already_agent');
  END IF;

  -- Already queued?
  SELECT mint, status, check_attempts INTO v_existing
  FROM public.candidate_agents WHERE mint = v_mint;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', v_existing.status,
      'check_attempts', v_existing.check_attempts,
      'queued', false
    );
  END IF;

  INSERT INTO public.candidate_agents (mint, discovered_via, status)
  VALUES (v_mint, 'search_lookup', 'pending');

  RETURN jsonb_build_object('ok', true, 'status', 'pending', 'queued', true);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_candidate_agent(text) FROM public;
GRANT EXECUTE ON FUNCTION public.enqueue_candidate_agent(text) TO anon, authenticated;