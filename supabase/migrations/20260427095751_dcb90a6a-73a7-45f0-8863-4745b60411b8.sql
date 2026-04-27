-- =====================================================================
-- Resolve linter warnings from the security-hardening migration
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Move the cron-bearer helper into a private schema so it is no
--    longer exposed via PostgREST. pg_cron runs as `postgres` and can
--    still call it cross-schema. We also have to update every cron job
--    that referenced public._spx_cron_bearer().
-- ---------------------------------------------------------------------

create schema if not exists spx_internal;
revoke all on schema spx_internal from public, anon, authenticated;
grant usage on schema spx_internal to postgres;

create or replace function spx_internal.cron_bearer()
returns text
language sql
stable
security definer
set search_path = spx_internal, vault, extensions
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'spx_cron_secret'
  limit 1;
$$;

revoke all on function spx_internal.cron_bearer() from public, anon, authenticated;

-- Drop the old public helper now that nothing should call it.
drop function if exists public._spx_cron_bearer();

-- Reschedule every spx-* job to use the new private helper.
do $$
declare
  jobs text[] := array[
    'spx-failure-reconciler',
    'spx-score-snapshot-daily',
    'spx-registered-agent-diff',
    'spx-scoring',
    'spx-verify-candidates',
    'spx-scan-x402',
    'spx-scan-agent-registry',
    'spx-backfill',
    'spx-reconciler'
  ];
  j text;
begin
  foreach j in array jobs loop
    begin
      perform cron.unschedule(j);
    exception when others then
      null;
    end;
  end loop;
end $$;

select cron.schedule('spx-failure-reconciler', '*/10 * * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-failure-reconciler',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

select cron.schedule('spx-score-snapshot-daily', '5 0 * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-score-snapshot',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

select cron.schedule('spx-registered-agent-diff', '20 * * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-registered-agent-diff',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

select cron.schedule('spx-scoring', '*/5 * * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-scoring',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

select cron.schedule('spx-verify-candidates', '*/5 * * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-verify-candidates',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

select cron.schedule('spx-scan-x402', '*/15 * * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-scan-x402',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

select cron.schedule('spx-scan-agent-registry', '10 * * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-scan-agent-registry',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

select cron.schedule('spx-backfill', '*/30 * * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-backfill',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

select cron.schedule('spx-reconciler', '*/10 * * * *', $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-reconciler',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
$cron$);

-- ---------------------------------------------------------------------
-- 2) Replace the SECURITY DEFINER view with SECURITY INVOKER + use
--    column-level grants so the safe columns are reachable, but the
--    sensitive columns (notes, signals, rejection_reason, submitted_by)
--    are not — even if a client tries to SELECT them on the base table.
-- ---------------------------------------------------------------------

drop view if exists public.candidate_agents_public;

-- Add a permissive read policy on candidate_agents for anon, but the
-- column-level revokes below will prevent reading sensitive columns.
drop policy if exists "Candidate agents readable by authenticated users"
  on public.candidate_agents;

create policy "Candidate agents readable by everyone (column-restricted)"
on public.candidate_agents
for select
to anon, authenticated
using (true);

-- Revoke blanket SELECT, then grant only the safe columns.
revoke select on public.candidate_agents from anon, authenticated;

grant select (
  mint,
  status,
  discovered_via,
  last_checked_at,
  check_attempts,
  category,
  identifier_kind,
  created_at,
  updated_at
) on public.candidate_agents to anon, authenticated;

-- Recreate the public view as a normal SECURITY INVOKER view over the
-- now-restricted base table. Reads will succeed because invoker (anon
-- or authenticated) holds column-level SELECT on every column the view
-- exposes, and the base-table policy permits the row read.
create view public.candidate_agents_public
with (security_invoker = true)
as
select
  mint,
  status,
  discovered_via,
  last_checked_at,
  check_attempts,
  category,
  identifier_kind,
  created_at,
  updated_at
from public.candidate_agents;

grant select on public.candidate_agents_public to anon, authenticated;