create or replace function public.verify_cron_bearer(p_token text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, vault, extensions
as $$
declare v text;
begin
  if p_token is null or length(p_token) < 16 then
    return false;
  end if;
  select decrypted_secret into v from vault.decrypted_secrets where name = 'spx_cron_secret' limit 1;
  if v is null or length(v) < 16 then
    return false;
  end if;
  return v = p_token;
end;
$$;

revoke all on function public.verify_cron_bearer(text) from public, anon, authenticated;
grant execute on function public.verify_cron_bearer(text) to service_role;