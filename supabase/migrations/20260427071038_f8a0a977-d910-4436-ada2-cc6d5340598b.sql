-- Wave 2: Risk-score / Confidence split
-- Add numeric confidence (0..1) plus methodology versions, while keeping
-- the existing categorical `confidence` text column for backward-compat.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS confidence_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS methodology_version text NOT NULL DEFAULT 'spx-score-v0.3.0',
  ADD COLUMN IF NOT EXISTS confidence_model_version text NOT NULL DEFAULT 'spx-confidence-v0.2.0',
  ADD COLUMN IF NOT EXISTS confidence_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_agents_confidence_score
  ON public.agents (confidence_score DESC);
