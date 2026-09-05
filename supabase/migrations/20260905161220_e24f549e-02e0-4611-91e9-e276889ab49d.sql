create policy "server only" on public.wallet_auth_nonces for all to authenticated using (false) with check (false);

revoke execute on function public.rate_limit_hit(text, integer, integer) from anon, authenticated;