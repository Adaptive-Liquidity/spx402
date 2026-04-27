-- Wave 1b/3 hardening: fix the two crons whose auth header was reading
-- a NULL `app.cron_secret` GUC (so they 401-ed silently) and add an
-- `agents.identity_owner` column so the registered-agent scan can detect
-- OPERATOR_CHANGED events between runs.

-- 1) Reschedule the failure reconciler with the same hardcoded bearer the
--    other working crons already use.
do $$
begin
  perform cron.unschedule('spx-failure-reconciler');
exception when others then null;
end $$;

select cron.schedule(
  'spx-failure-reconciler',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-failure-reconciler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SPX402CONTROL3140$'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- 2) Reschedule the daily score-snapshot worker the same way.
do $$
begin
  perform cron.unschedule('spx-score-snapshot-daily');
exception when others then null;
end $$;

select cron.schedule(
  'spx-score-snapshot-daily',
  '5 0 * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-score-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SPX402CONTROL3140$'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- 3) Schedule a dedicated registered-agent diff worker. It re-scans the
--    AgentIdentity PDAs every hour and emits OPERATOR_CHANGED /
--    CONFIG_CHANGED when the on-chain state diverges from the snapshot
--    we last stored on `agents`.
do $$
begin
  perform cron.unschedule('spx-registered-agent-diff');
exception when others then null;
end $$;

select cron.schedule(
  'spx-registered-agent-diff',
  '20 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-registered-agent-diff',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SPX402CONTROL3140$'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

-- 4) Snapshot column for the AgentIdentity PDA owner, so the diff worker
--    has something to compare against between runs. NULL on existing rows
--    means "no owner snapshotted yet" — first scan after this migration
--    seeds the value and emits no event.
alter table public.agents
  add column if not exists identity_owner text;

create index if not exists idx_agents_identity_owner
  on public.agents (identity_owner);
