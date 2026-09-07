-- Quarantine AEON demo agents (trust-engine P1).
--
-- 20260829110000_seed_aeon_demo_agents.sql inserted graded demo rows
-- (SPX AA etc.) with synthetic mints. Those rows violate the no-seeded-grades
-- rule: grades must only come from decoded evidence + scoring. Remove them
-- and any dependent receipts. Re-run safe.

DELETE FROM public.aeon_receipts
WHERE agent_mint IN (
  'AEONNova11111111111111111111111111111111111111',
  'AEONAria22222222222222222222222222222222222222',
  'AEONFlux33333333333333333333333333333333333333',
  'AEONNull44444444444444444444444444444444444444'
);

DELETE FROM public.agents
WHERE mint IN (
  'AEONNova11111111111111111111111111111111111111',
  'AEONAria22222222222222222222222222222222222222',
  'AEONFlux33333333333333333333333333333333333333',
  'AEONNull44444444444444444444444444444444444444'
);

