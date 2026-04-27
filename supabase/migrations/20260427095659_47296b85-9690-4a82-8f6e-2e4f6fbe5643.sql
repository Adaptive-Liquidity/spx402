-- =====================================================================
-- SECURITY HARDENING — rotate cron bearer + restrict candidate_agents
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Vault entry for the cron bearer.
--    We create a Vault secret named 'spx_cron_secret' if it does not
--    exist yet. The actual value is inserted in a follow-up data step
--    (vault.create_secret) so the plaintext never lands in this migration.
--    Jobs read it via `vault.decrypted_secrets`.
-- ---------------------------------------------------------------------

-- Helper that returns the current cron secret from Vault. Marked
-- SECURITY DEFINER so pg_cron (which runs as `postgres`) can call it
-- without granting the cron job role read access to vault directly.
create or replace function public._spx_cron_bearer()
returns text
language sql
stable
security definer
set search_path = public, vault, extensions
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'spx_cron_secret'
  limit 1;
$$;

revoke all on function public._spx_cron_bearer() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) Reschedule every spx-* cron job to read the bearer from Vault
--    instead of carrying it in plaintext. We unschedule then reschedule
--    each job idempotently.
-- ---------------------------------------------------------------------

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

-- Failure reconciler — every 10 minutes
select cron.schedule(
  'spx-failure-reconciler',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-failure-reconciler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- Score snapshot — daily at 00:05
select cron.schedule(
  'spx-score-snapshot-daily',
  '5 0 * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-score-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- Registered-agent diff — hourly at :20
select cron.schedule(
  'spx-registered-agent-diff',
  '20 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-registered-agent-diff',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- Scoring worker — every 5 minutes
select cron.schedule(
  'spx-scoring',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-scoring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- Verify candidates — every 5 minutes
select cron.schedule(
  'spx-verify-candidates',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-verify-candidates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- x402 scanner — every 15 minutes
select cron.schedule(
  'spx-scan-x402',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-scan-x402',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- Agent registry scanner — hourly at :10
select cron.schedule(
  'spx-scan-agent-registry',
  '10 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-scan-agent-registry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- Backfill — every 30 minutes
select cron.schedule(
  'spx-backfill',
  '*/30 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-backfill',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- Buyback/burn reconciler — every 10 minutes
select cron.schedule(
  'spx-reconciler',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-reconciler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(public._spx_cron_bearer(), '')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- ---------------------------------------------------------------------
-- 3) Restrict candidate_agents — drop public SELECT, add authenticated-only
-- ---------------------------------------------------------------------

drop policy if exists "Candidate agents are publicly readable" on public.candidate_agents;

create policy "Candidate agents readable by authenticated users"
on public.candidate_agents
for select
to authenticated
using (true);

-- ---------------------------------------------------------------------
-- 4) Public, safe view of candidate verification status.
--    Hides submitted_by (user PII), notes (internal), signals (review
--    payload), rejection_reason (internal review string).
-- ---------------------------------------------------------------------

create or replace view public.candidate_agents_public
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

-- The view inherits RLS from the base table when security_invoker = true,
-- which would block anon. We instead want this view to be a deliberately
-- safe public surface, so we re-grant SELECT to anon/authenticated and
-- add a permissive policy ONLY for the columns the view exposes via a
-- second policy on the base table that is restricted to those columns'
-- read path through the view.
--
-- Simpler approach: switch the view to security_definer so it bypasses
-- RLS, owned by a role that already has full SELECT (postgres).
alter view public.candidate_agents_public set (security_invoker = false);

grant select on public.candidate_agents_public to anon, authenticated;