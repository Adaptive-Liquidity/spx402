-- AEON identity contract + private ingest subjects.
-- Unapplied in this change set. Do not rebuild SET NOT NULL on event_uid.
--
-- ROLLOUT: apply this migration before deploying app code that SELECTs the
-- new columns or filters publication_status. Existing catalog rows are
-- flipped to published so the public index stays visible after apply; new
-- AEON registrations insert unpublished.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS aeon_agent_identity text,
  ADD COLUMN IF NOT EXISTS aeon_authority_addresses text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS aeon_bond_addresses text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS aeon_program_id text,
  ADD COLUMN IF NOT EXISTS publication_status text;

-- Existing catalog stays listed. New inserts default unpublished after NOT NULL.
UPDATE public.agents
SET publication_status = 'published'
WHERE publication_status IS NULL;

ALTER TABLE public.agents
  ALTER COLUMN publication_status SET DEFAULT 'unpublished',
  ALTER COLUMN publication_status SET NOT NULL;

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_publication_status_check;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_publication_status_check
  CHECK (publication_status IN ('unpublished', 'published'));

CREATE INDEX IF NOT EXISTS idx_agents_aeon_cri_address
  ON public.agents (aeon_cri_address)
  WHERE aeon_cri_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS agents_executor_wallet_idx
  ON public.agents (executor_wallet)
  WHERE executor_wallet IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agents_aeon_agent_identity
  ON public.agents (aeon_agent_identity)
  WHERE aeon_agent_identity IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agents_aeon_authority_addresses
  ON public.agents
  USING GIN (aeon_authority_addresses);

CREATE INDEX IF NOT EXISTS idx_agents_aeon_bond_addresses
  ON public.agents
  USING GIN (aeon_bond_addresses);

CREATE INDEX IF NOT EXISTS idx_agents_publication_status
  ON public.agents (publication_status);

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_category_check;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_category_check
  CHECK (category IN (
    'tokenized_buyback',
    'registered_agent',
    'x402_executor',
    'copy_trader',
    'task_executor',
    'general',
    'aeon_executor'
  ));

ALTER TABLE public.candidate_agents DROP CONSTRAINT IF EXISTS candidate_agents_category_check;
ALTER TABLE public.candidate_agents
  ADD CONSTRAINT candidate_agents_category_check
  CHECK (category IN (
    'tokenized_buyback',
    'registered_agent',
    'x402_executor',
    'copy_trader',
    'task_executor',
    'general',
    'aeon_executor'
  ));

DROP POLICY IF EXISTS "Agents are publicly readable" ON public.agents;

CREATE POLICY "Published agents are publicly readable"
ON public.agents
FOR SELECT
USING (publication_status = 'published');
