-- Withheld grading state (trust-engine).
--
-- grade=null/score=null must be persistable when the AEON pipeline is
-- disabled (or any future withheld condition). Previously these columns
-- were NOT NULL, which made a true withheld state unrepresentable.
-- Adds withheld_reason as a first-class fact column. Deliberately NO index
-- on withheld_reason: Explore/Leaderboard filter in application code; add
-- an index only if DB-level WHERE filtering is introduced later.
--
-- ROLLOUT CONTRACT (migration-first, enforced):
-- 1. Apply this migration to the database BEFORE deploying any application
--    build that SELECTs withheld_reason or persists grade/score nulls.
--    Pre-migration builds do not reference the column; post-migration builds
--    require it. Deploying app-first breaks reads (undefined-column) and the
--    withhold write path.
-- 2. After apply, regenerate src/integrations/supabase/types.ts from the live
--    schema (supabase gen types). Do not hand-edit the generated file. The
--    type diff (nullable grade/score/confidence + withheld_reason present)
--    is itself migration evidence and must be attached to the rollout record.
-- 3. Code paths that touch withheld_reason before the regen use the documented
--    untyped escape hatches (agents as never / unknown casts) so typecheck
--    stays green on both sides of the migration. Remove the hatches in the
--    cleanup PR that lands the regenerated types.

ALTER TABLE public.agents
  ALTER COLUMN grade DROP NOT NULL,
  ALTER COLUMN score DROP NOT NULL,
  ALTER COLUMN confidence DROP NOT NULL,
  ALTER COLUMN confidence_score DROP NOT NULL,
  ALTER COLUMN methodology_version DROP NOT NULL,
  ALTER COLUMN confidence_model_version DROP NOT NULL;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS withheld_reason text;

