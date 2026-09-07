-- Quarantine AEON demo agents (trust-engine P1).
--
-- 20260829110000_seed_aeon_demo_agents.sql inserted graded demo rows
-- (SPX AA etc.) with synthetic mints. Those rows violate the no-seeded-grades
-- rule: grades must only come from decoded evidence + scoring. Remove them
-- and any dependent receipts. Re-run safe.
--
-- NOTE: deployed aeon_receipts uses column mint (see generated
-- src/integrations/supabase/types.ts), not agent_mint. Using mint here so
-- the migration cannot abort on undefined-column before quarantine completes.

DELETE FROM public.aeon_receipts
WHERE mint IN (
  'AEONNova11111111111111111111111111111111111111',
  'AEONAria22222222222222222222222222222222222222',
  'AEONFlux33333333333333333333333333333333333333',
  'AEONNull44444444444444444444444444444444444444',
  'SPX402Mint55555555555555555555555555555555555555'
);

DELETE FROM public.agents
WHERE mint IN (
  'AEONNova11111111111111111111111111111111111111',
  'AEONAria22222222222222222222222222222222222222',
  'AEONFlux33333333333333333333333333333333333333',
  'AEONNull44444444444444444444444444444444444444',
  'SPX402Mint55555555555555555555555555555555555555'
);

