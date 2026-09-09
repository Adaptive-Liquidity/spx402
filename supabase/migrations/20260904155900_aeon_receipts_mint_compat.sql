-- Compat for a schema fork: 20260829100000 created aeon_receipts with
-- agent_mint, while 20260904155901 assumes mint/sequence (production shape).
-- CREATE TABLE IF NOT EXISTS in that later file is a no-op when the table
-- already exists, then CREATE INDEX on mint fails. These ADD COLUMN IF NOT
-- EXISTS statements are no-ops on production (mint already present).
-- DROP IF EXISTS statements let the original 55901 CREATE POLICY / TRIGGER /
-- FUNCTION succeed after earlier migrations already created them.

ALTER TABLE public.aeon_receipts
  ADD COLUMN IF NOT EXISTS mint text,
  ADD COLUMN IF NOT EXISTS sequence bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signature text,
  ADD COLUMN IF NOT EXISTS slot bigint,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'aeon_receipts'
      AND column_name = 'agent_mint'
  ) THEN
    UPDATE public.aeon_receipts
    SET mint = agent_mint
    WHERE mint IS NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "AEON receipts are publicly readable" ON public.aeon_receipts;

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_prefix text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_api_keys_updated_at ON public.api_keys;

DROP FUNCTION IF EXISTS public.get_api_key_usage(uuid);
