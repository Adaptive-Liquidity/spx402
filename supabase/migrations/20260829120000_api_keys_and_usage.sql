-- =========================================================
-- API Key Management for x402 Billing
-- =========================================================

-- API Keys table
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null unique, -- SHA256 of the actual key
  name text not null,
  tier text not null default 'free' check (tier in ('free', 'pro', 'team')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  daily_limit integer not null default 10,
  monthly_limit integer,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  last_used_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

alter table public.api_keys enable row level security;

create policy "Users can view own API keys"
on public.api_keys
for select
using (auth.uid() = user_id);

create policy "Users can create own API keys"
on public.api_keys
for insert
with check (auth.uid() = user_id);

create policy "Users can update own API keys"
on public.api_keys
for update
using (auth.uid() = user_id);

create index idx_api_keys_user on public.api_keys (user_id);
create index idx_api_keys_hash on public.api_keys (key_hash);
create index idx_api_keys_status on public.api_keys (status);

-- API Usage tracking
create table public.api_usage (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  endpoint text not null check (endpoint in ('score', 'dossier', 'evidence')),
  payer text, -- Ethereum/Base address of payer
  status text not null check (status in ('success', 'payment_required', 'rate_limited', 'error')),
  response_time_ms integer,
  created_at timestamptz not null default now()
);

alter table public.api_usage enable row level security;

create policy "Users can view usage for own API keys"
on public.api_usage
for select
using (
  exists (
    select 1 from public.api_keys k
    where k.id = api_usage.api_key_id and k.user_id = auth.uid()
  )
);

create policy "Service role can insert usage"
on public.api_usage
for insert
with check (true); -- service role bypasses RLS

create index idx_api_usage_key on public.api_usage (api_key_id);
create index idx_api_usage_created on public.api_usage (created_at);
create index idx_api_usage_payer on public.api_usage (payer);

-- API Key creation function (for service role / admin)
create or replace function public.create_api_key(
  p_user_id uuid,
  p_name text,
  p_tier text default 'free',
  p_daily_limit integer default null,
  p_expires_at timestamptz default null
) returns table (
  key_id uuid,
  api_key text,
  key_hash text
) language plpgsql security definer set search_path = public as $$
declare
  raw_key text;
  key_hash text;
  daily_limit integer;
begin
  -- Generate secure random key
  raw_key := 'spx402_' || encode(gen_random_bytes(32), 'hex');
  key_hash := encode(sha256(raw_key::bytea), 'hex');

  daily_limit := coalesce(p_daily_limit,
    case p_tier
      when 'free' then 10
      when 'pro' then 1000
      when 'team' then 10000
      else 10
    end);

  insert into public.api_keys (user_id, key_hash, name, tier, daily_limit, expires_at)
  values (p_user_id, key_hash, p_name, p_tier, daily_limit, p_expires_at)
  returning id into key_id;

  return query select key_id, raw_key, key_hash;
end;
$$;

-- Function to get current usage for an API key
create or replace function public.get_api_key_usage(p_key_id uuid)
returns table (
  used_today integer,
  used_this_month integer,
  total_calls bigint
) language plpgsql security definer set search_path = public as $$
begin
  return query
  select
    (select count(*) from public.api_usage
     where api_key_id = p_key_id
     and created_at >= current_date) as used_today,
    (select count(*) from public.api_usage
     where api_key_id = p_key_id
     and created_at >= date_trunc('month', current_date)) as used_this_month,
    (select count(*) from public.api_usage
     where api_key_id = p_key_id) as total_calls;
end;
$$;

-- updated_at trigger for api_keys
create trigger set_api_keys_updated_at
before update on public.api_keys
for each row execute function public.set_updated_at();