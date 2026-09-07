-- Withheld grading state (trust-engine).
--
-- grade=null/score=null must be persistable when the AEON pipeline is
-- disabled (or any future withheld condition). Previously these columns
-- were NOT NULL, which made a true withheld state unrepresentable.
-- Adds withheld_reason as a first-class fact column. Deliberately NO index
-- on withheld_reason: Explore/Leaderboard filter in application code; add
-- an index only if DB-level WHERE filtering is introduced later.

ALTER TABLE public.agents
  ALTER COLUMN grade DROP NOT NULL,
  ALTER COLUMN score DROP NOT NULL,
  ALTER COLUMN confidence DROP NOT NULL,
  ALTER COLUMN confidence_score DROP NOT NULL,
  ALTER COLUMN methodology_version DROP NOT NULL,
  ALTER COLUMN confidence_model_version DROP NOT NULL;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS withheld_reason text;

