-- S2-G2 Phase A: one canonical v2 event of each type per Outcome Contract.
--
-- This makes the OPENED deadline commitment atomic under concurrent ingest:
-- two requests can both pass the read-side cross-check, but only one can
-- commit. It also prevents idempotency-key rotation from inflating contract
-- counts used by scoring.
create unique index if not exists agent_events_oc_v2_contract_type_unique
  on public.agent_events (mint, (raw ->> 'contract_id'), type)
  where type in ('OC_OPENED', 'OC_AWARDED', 'OC_FULFILLED', 'OC_FAILED', 'OC_SLASHED')
    and raw ->> 'source_schema' = 'flok.oc-evidence.v2';
