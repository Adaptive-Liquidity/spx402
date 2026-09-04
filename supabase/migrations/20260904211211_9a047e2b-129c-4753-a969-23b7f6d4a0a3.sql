-- lovable-cron-fallback-reviewed: 96 runs/day; active x402 service probing is time-based (challenge every 6h, settlement every 24h) and the 15-min tick is the batching window for due services
do $$
declare j text;
begin
  foreach j in array array['spx402-scan-agent-registry','spx402-scan-x402','spx402-verify-candidates','spx-probe-services'] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;

select cron.schedule(
  'spx-probe-services',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--ef36978c-aaab-4b03-b1f2-4232d6d7a2d3.lovable.app/api/public/cron-probe-services',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(spx_internal.cron_bearer(),'')),
    body := '{}'::jsonb) as request_id;
  $cron$
);