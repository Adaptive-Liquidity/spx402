create policy "server only" on public.indexer_state for all to authenticated using (false) with check (false);
create policy "server only" on public.alert_dispatch_state for all to authenticated using (false) with check (false);
create policy "server only" on public.x402_payments for all to authenticated using (false) with check (false);
create policy "server only" on public.rate_limit_counters for all to authenticated using (false) with check (false);