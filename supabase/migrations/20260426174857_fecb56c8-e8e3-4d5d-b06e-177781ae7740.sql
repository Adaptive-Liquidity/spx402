-- =========================================================
-- Agents table (public read, no public write)
-- =========================================================
create table public.agents (
  mint text primary key,
  symbol text not null,
  name text not null,
  tagline text,
  grade text not null,
  score integer,
  status text not null default 'unknown',
  operator_verified boolean not null default false,
  confidence text not null default 'low',
  parser_version text not null default 'v0.1.7',
  last_indexed_seconds integer not null default 0,
  total_deposits_count integer not null default 0,
  total_buybacks_count integer not null default 0,
  total_burns_count integer not null default 0,
  failed_windows integer not null default 0,
  total_deposited_sol numeric not null default 0,
  total_buyback_sol numeric not null default 0,
  total_burned_tokens numeric not null default 0,
  buyback_execution_rate numeric not null default 0,
  burn_confirmation_rate numeric not null default 0,
  buyback_bps integer not null default 0,
  last_buyback_label text,
  last_burn_label text,
  config_last_changed_label text,
  score_breakdown jsonb not null default '{}'::jsonb,
  verdict text,
  events jsonb not null default '[]'::jsonb,
  price_series jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agents enable row level security;

create policy "Agents are publicly readable"
on public.agents
for select
using (true);

create trigger set_agents_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

create index idx_agents_grade on public.agents (grade);
create index idx_agents_status on public.agents (status);
create index idx_agents_score on public.agents (score desc nulls last);

-- =========================================================
-- Watchlist table (per-user)
-- =========================================================
create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mint text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, mint)
);

alter table public.watchlist enable row level security;

create policy "Users can view own watchlist"
on public.watchlist
for select
using (auth.uid() = user_id);

create policy "Users can add to own watchlist"
on public.watchlist
for insert
with check (auth.uid() = user_id);

create policy "Users can update own watchlist"
on public.watchlist
for update
using (auth.uid() = user_id);

create policy "Users can remove from own watchlist"
on public.watchlist
for delete
using (auth.uid() = user_id);

create index idx_watchlist_user on public.watchlist (user_id);
create index idx_watchlist_mint on public.watchlist (mint);