-- 1. agent_events: append-only decoded program events
create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  mint text not null,
  type text not null,
  severity text not null default 'info',
  signature text not null unique,
  slot bigint,
  occurred_at timestamptz not null default now(),
  amount_sol numeric not null default 0,
  amount_token numeric not null default 0,
  raw jsonb not null default '{}'::jsonb,
  parser_version text not null default 'v0.1.7',
  created_at timestamptz not null default now()
);

create index idx_agent_events_mint_occurred on public.agent_events (mint, occurred_at desc);
create index idx_agent_events_severity_occurred on public.agent_events (severity, occurred_at desc);

alter table public.agent_events enable row level security;

create policy "Agent events are publicly readable"
  on public.agent_events for select
  using (true);

-- (no insert/update/delete policies → only service role can write)

-- 2. indexer_runs: worker heartbeats for the status page
create table public.indexer_runs (
  id uuid primary key default gen_random_uuid(),
  worker text not null,
  ok boolean not null default true,
  ran_at timestamptz not null default now(),
  duration_ms integer not null default 0,
  notes text
);

create index idx_indexer_runs_worker_ran on public.indexer_runs (worker, ran_at desc);

alter table public.indexer_runs enable row level security;

create policy "Indexer runs are publicly readable"
  on public.indexer_runs for select
  using (true);

-- 3. operator_challenges: Ed25519 challenge/response for operator verify
create table public.operator_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mint text not null,
  wallet text not null,
  nonce text not null,
  signature text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

create index idx_operator_challenges_user on public.operator_challenges (user_id, created_at desc);
create index idx_operator_challenges_mint on public.operator_challenges (mint);

alter table public.operator_challenges enable row level security;

create policy "Users can view own operator challenges"
  on public.operator_challenges for select
  using (auth.uid() = user_id);

create policy "Users can insert own operator challenges"
  on public.operator_challenges for insert
  with check (auth.uid() = user_id);

create policy "Users can update own operator challenges"
  on public.operator_challenges for update
  using (auth.uid() = user_id);

create policy "Users can delete own operator challenges"
  on public.operator_challenges for delete
  using (auth.uid() = user_id);

-- 4. changelog: replaces hardcoded entries on /changelog
create table public.changelog (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  released_on date not null,
  type text not null,
  items text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_changelog_released on public.changelog (released_on desc);

alter table public.changelog enable row level security;

create policy "Changelog is publicly readable"
  on public.changelog for select
  using (true);

create trigger changelog_set_updated_at
  before update on public.changelog
  for each row execute function public.set_updated_at();

-- Seed initial changelog entries (mirrors current hardcoded list)
insert into public.changelog (version, released_on, type, items) values
  ('v0.1.7', '2026-04-24', 'parser', array[
    'Added buyback_bps config diffing — emits CONFIG_CHANGED events with previous/next values.',
    'Improved SPL burn matching across multi-slot sequences.',
    'Fixed false-positive FAILED_WINDOW under high RPC latency.'
  ]),
  ('v0.1.6', '2026-04-18', 'product', array[
    'Added SPX404 archive view in /explore.',
    'Operator badges now expose JSON-LD metadata for embedding.',
    'Pricing page redesign.'
  ]),
  ('v0.1.5', '2026-04-09', 'methodology', array[
    'Removed token price from Transparency Score (was previously reserved 0%, now formally documented).',
    'Recency weight increased from 8% to 10%.',
    'Operator verification weight introduced at 5%.'
  ]),
  ('v0.1.4', '2026-04-02', 'product', array[
    'x402 pay-per-call API entered private beta.',
    'Webhook delivery added to Team plan with idempotent retries.'
  ]);