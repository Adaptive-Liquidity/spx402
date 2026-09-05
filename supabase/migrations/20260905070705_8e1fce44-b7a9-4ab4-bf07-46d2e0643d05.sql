-- lovable-cron-fallback-reviewed: 288 runs/day; alert notices must arrive within 5 minutes of an indexed event, and there is no push path from the indexer to the dispatcher.
select cron.schedule(
  'spx-alert-dispatch',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-alert-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb, timeout_milliseconds := 30000) as request_id;
  $$
);