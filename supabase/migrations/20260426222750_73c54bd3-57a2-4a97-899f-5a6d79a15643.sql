ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS deposit_address text,
  ADD COLUMN IF NOT EXISTS operator_wallet text,
  ADD COLUMN IF NOT EXISTS scored_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_agents_deposit_address
  ON public.agents (deposit_address)
  WHERE deposit_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_events_mint_occurred
  ON public.agent_events (mint, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_indexer_runs_worker_ran
  ON public.indexer_runs (worker, ran_at DESC);