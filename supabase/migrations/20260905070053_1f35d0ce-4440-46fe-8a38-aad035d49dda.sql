-- Alert delivery channels (per user) ------------------------------------
create table if not exists public.alert_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('email','webhook','slack','sms')),
  target text not null,
  label text not null default '',
  secret text,
  verified boolean not null default false,
  verify_token text,
  paused boolean not null default false,
  digest text not null default 'instant' check (digest in ('instant','daily')),
  last_delivery_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, target)
);

grant select, insert, update, delete on public.alert_channels to authenticated;
grant all on public.alert_channels to service_role;
alter table public.alert_channels enable row level security;

create policy "own channels select" on public.alert_channels
  for select to authenticated using (auth.uid() = user_id);
create policy "own channels insert" on public.alert_channels
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own channels update" on public.alert_channels
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own channels delete" on public.alert_channels
  for delete to authenticated using (auth.uid() = user_id);

-- Delivery attempt log ---------------------------------------------------
create table if not exists public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  channel_id uuid references public.alert_channels(id) on delete cascade,
  subscription_id uuid,
  event_id uuid,
  mint text,
  event_type text,
  status text not null check (status in ('sent','failed','skipped','test')),
  http_status int,
  error text,
  attempt int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists alert_deliveries_user_idx on public.alert_deliveries (user_id, created_at desc);
create index if not exists alert_deliveries_event_idx on public.alert_deliveries (event_id);

grant select on public.alert_deliveries to authenticated;
grant all on public.alert_deliveries to service_role;
alter table public.alert_deliveries enable row level security;
create policy "own deliveries select" on public.alert_deliveries
  for select to authenticated using (auth.uid() = user_id);

-- Dispatcher cursor ------------------------------------------------------
create table if not exists public.alert_dispatch_state (
  id int primary key default 1,
  last_event_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant all on public.alert_dispatch_state to service_role;
alter table public.alert_dispatch_state enable row level security;
insert into public.alert_dispatch_state (id) values (1) on conflict (id) do nothing;

-- Verified x402 payments (replay protection) -----------------------------
create table if not exists public.x402_payments (
  tx_hash text primary key,
  chain text not null default 'base',
  payer text,
  pay_to text not null,
  amount bigint not null,
  endpoint text not null,
  resource text,
  verified_at timestamptz not null default now()
);
grant all on public.x402_payments to service_role;
alter table public.x402_payments enable row level security;

-- API keys are minted server-side only ----------------------------------
revoke insert on public.api_keys from authenticated;
drop policy if exists "Users can insert own api keys" on public.api_keys;
drop policy if exists "users insert own api keys" on public.api_keys;