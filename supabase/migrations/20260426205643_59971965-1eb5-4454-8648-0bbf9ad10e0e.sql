-- Alert subscriptions: per-user, per-agent alert configurations
create table public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mint text not null,
  channel text not null default 'email' check (channel in ('email', 'telegram', 'webhook')),
  event_deposit boolean not null default false,
  event_buyback boolean not null default true,
  event_burn boolean not null default true,
  event_failed_window boolean not null default true,
  event_config_change boolean not null default true,
  event_score_drop boolean not null default false,
  min_sol_threshold numeric not null default 0,
  score_drop_threshold integer not null default 10,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mint, channel)
);

create index idx_alert_subscriptions_user on public.alert_subscriptions(user_id);
create index idx_alert_subscriptions_mint on public.alert_subscriptions(mint);

alter table public.alert_subscriptions enable row level security;

create policy "Users can view own alert subscriptions"
  on public.alert_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own alert subscriptions"
  on public.alert_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own alert subscriptions"
  on public.alert_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own alert subscriptions"
  on public.alert_subscriptions for delete
  using (auth.uid() = user_id);

create trigger update_alert_subscriptions_updated_at
  before update on public.alert_subscriptions
  for each row execute function public.set_updated_at();