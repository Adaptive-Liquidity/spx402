
CREATE TABLE IF NOT EXISTS public.agent_score_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mint text NOT NULL,
  score integer,
  confidence_score numeric NOT NULL DEFAULT 0,
  grade text,
  methodology_version text NOT NULL DEFAULT 'spx-score-v0.3.0',
  confidence_model_version text NOT NULL DEFAULT 'spx-confidence-v0.2.0',
  taken_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_score_snapshots_mint_taken_at
  ON public.agent_score_snapshots (mint, taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_score_snapshots_taken_at
  ON public.agent_score_snapshots (taken_at DESC);

ALTER TABLE public.agent_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Score snapshots are publicly readable"
  ON public.agent_score_snapshots
  FOR SELECT
  USING (true);
