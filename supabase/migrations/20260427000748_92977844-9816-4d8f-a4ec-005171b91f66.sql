
-- 1. candidate_agents table
CREATE TABLE public.candidate_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mint text NOT NULL UNIQUE,
  discovered_via text NOT NULL DEFAULT 'manual_submit',  -- helius_stream | manual_submit | registry_scan
  submitted_by uuid,                                       -- auth.users.id, nullable for indexer-discovered
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,              -- { skills_md: bool, invoice_pda: bool, on_chain_earnings: bool, agent_registry: bool }
  status text NOT NULL DEFAULT 'pending',                  -- pending | verifying | verified | rejected
  rejection_reason text,
  last_checked_at timestamptz,
  check_attempts integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_agents_status ON public.candidate_agents(status);
CREATE INDEX idx_candidate_agents_last_checked ON public.candidate_agents(last_checked_at NULLS FIRST);

ALTER TABLE public.candidate_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidate agents are publicly readable"
  ON public.candidate_agents FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit candidates"
  ON public.candidate_agents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND submitted_by = auth.uid() AND discovered_via = 'manual_submit');

CREATE TRIGGER set_candidate_agents_updated_at
  BEFORE UPDATE ON public.candidate_agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. agents.metadata_uri
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS metadata_uri text;

-- 3. Lock indexer_runs from anonymous reads (security finding)
DROP POLICY IF EXISTS "Indexer runs are publicly readable" ON public.indexer_runs;
CREATE POLICY "Indexer runs visible to authenticated users"
  ON public.indexer_runs FOR SELECT
  TO authenticated
  USING (true);

-- 4. Tighten operator_challenges UPDATE policy (security finding)
DROP POLICY IF EXISTS "Users can update own operator challenges" ON public.operator_challenges;

-- Trigger: prevent mutating identity-bearing fields after creation
CREATE OR REPLACE FUNCTION public.guard_operator_challenge_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.mint IS DISTINCT FROM OLD.mint
     OR NEW.wallet IS DISTINCT FROM OLD.wallet
     OR NEW.nonce IS DISTINCT FROM OLD.nonce
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'operator_challenges: only signature and signed_at may be updated';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_operator_challenge_update_trg
  BEFORE UPDATE ON public.operator_challenges
  FOR EACH ROW EXECUTE FUNCTION public.guard_operator_challenge_update();

CREATE POLICY "Users can update own operator challenges"
  ON public.operator_challenges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Wipe demo agents (clean slate for real-agent discovery)
DELETE FROM public.agent_events;
DELETE FROM public.agents;
