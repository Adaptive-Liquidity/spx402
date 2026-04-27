ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_agents_flagged ON public.agents (flagged);
CREATE INDEX IF NOT EXISTS idx_agents_grade ON public.agents (grade);