-- lovable-cron-fallback-reviewed: no cadence change; only raises the reply wait for existing jobs
do $$
declare r record; newcmd text;
begin
  for r in select jobid, jobname, schedule, command from cron.job where jobname like 'spx-%' and command not like '%timeout_milliseconds%' loop
    newcmd := replace(r.command, 'body := ''{}''::jsonb)', 'body := ''{}''::jsonb, timeout_milliseconds := 30000)');
    if newcmd = r.command then
      continue;
    end if;
    perform cron.schedule(r.jobname, r.schedule, newcmd);
  end loop;
end $$;