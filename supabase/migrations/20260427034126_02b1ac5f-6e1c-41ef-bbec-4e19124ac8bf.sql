-- ============================================================================
-- Identity model upgrade for SPX402 (revised — keeps mint as PK)
-- For non-tokenized agents, mint holds the on-chain identifier (core asset
-- address or executor wallet). identifier_kind discriminates the meaning.
-- ============================================================================

-- 1. agents table
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS identifier_kind text NOT NULL DEFAULT 'mint',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'tokenized_buyback',
  ADD COLUMN IF NOT EXISTS executor_wallet text,
  ADD COLUMN IF NOT EXISTS core_asset text;

CREATE INDEX IF NOT EXISTS agents_category_idx ON public.agents (category);
CREATE INDEX IF NOT EXISTS agents_identifier_kind_idx ON public.agents (identifier_kind);
CREATE INDEX IF NOT EXISTS agents_executor_wallet_idx ON public.agents (executor_wallet) WHERE executor_wallet IS NOT NULL;
CREATE INDEX IF NOT EXISTS agents_core_asset_idx ON public.agents (core_asset) WHERE core_asset IS NOT NULL;

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_identifier_kind_check;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_identifier_kind_check
  CHECK (identifier_kind IN ('mint', 'core_asset', 'executor_wallet'));

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_category_check;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_category_check
  CHECK (category IN (
    'tokenized_buyback',
    'registered_agent',
    'x402_executor',
    'copy_trader',
    'task_executor',
    'general'
  ));

-- 2. candidate_agents table — mirror the new fields
ALTER TABLE public.candidate_agents
  ADD COLUMN IF NOT EXISTS identifier_kind text NOT NULL DEFAULT 'mint',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'tokenized_buyback',
  ADD COLUMN IF NOT EXISTS executor_wallet text,
  ADD COLUMN IF NOT EXISTS core_asset text;

CREATE INDEX IF NOT EXISTS candidate_agents_category_idx ON public.candidate_agents (category);

ALTER TABLE public.candidate_agents
  DROP CONSTRAINT IF EXISTS candidate_agents_identifier_kind_check;
ALTER TABLE public.candidate_agents
  ADD CONSTRAINT candidate_agents_identifier_kind_check
  CHECK (identifier_kind IN ('mint', 'core_asset', 'executor_wallet'));

ALTER TABLE public.candidate_agents
  DROP CONSTRAINT IF EXISTS candidate_agents_category_check;
ALTER TABLE public.candidate_agents
  ADD CONSTRAINT candidate_agents_category_check
  CHECK (category IN (
    'tokenized_buyback',
    'registered_agent',
    'x402_executor',
    'copy_trader',
    'task_executor',
    'general'
  ));

-- 3. agent_events — index for category-aware aggregation
CREATE INDEX IF NOT EXISTS agent_events_mint_type_occurred_idx
  ON public.agent_events (mint, type, occurred_at DESC);