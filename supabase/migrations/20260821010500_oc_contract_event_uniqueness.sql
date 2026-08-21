-- S2-G2 Phase A: one canonical v2 event of each type per Outcome Contract.
--
-- This makes the OPENED deadline commitment atomic under concurrent ingest:
-- two requests can both pass the read-side cross-check, but only one can
-- commit. It also prevents idempotency-key rotation from inflating contract
-- counts used by scoring.
--
-- Release ordering: apply and verify this migration before deploying the
-- authenticated v2 ingest code. The repository does not pin a migration runner
-- with CREATE INDEX CONCURRENTLY support, so this uses the portable form below.
-- It briefly blocks writes while PostgreSQL builds the index; schedule it in a
-- low-traffic window and do not advance the application deploy until it succeeds.
--
-- Existing duplicates require an operator decision about which evidence to
-- retain. Fail explicitly instead of deleting evidence automatically.
do $migration$
begin
  if exists (
    select 1
    from public.agent_events
    where type in ('OC_OPENED', 'OC_AWARDED', 'OC_FULFILLED', 'OC_FAILED', 'OC_SLASHED')
      and raw ->> 'source_schema' = 'flok.oc-evidence.v2'
    group by mint, raw ->> 'contract_id', type
    having count(*) > 1
  ) then
    raise exception
      'duplicate flok.oc-evidence.v2 contract events exist; repair them before deploying v2 ingest';
  end if;
end
$migration$;

create unique index if not exists agent_events_oc_v2_contract_type_unique
  on public.agent_events (mint, (raw ->> 'contract_id'), type)
  where type in ('OC_OPENED', 'OC_AWARDED', 'OC_FULFILLED', 'OC_FAILED', 'OC_SLASHED')
    and raw ->> 'source_schema' = 'flok.oc-evidence.v2';
