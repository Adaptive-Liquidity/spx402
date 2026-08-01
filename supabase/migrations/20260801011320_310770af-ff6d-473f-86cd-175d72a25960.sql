alter table public.agents
  add column if not exists chain text not null default 'solana';
alter table public.candidate_agents
  add column if not exists chain text not null default 'solana';
alter table public.agent_events
  add column if not exists chain text not null default 'solana';

create index if not exists agent_events_chain_idx on public.agent_events (chain);
create index if not exists agents_chain_idx on public.agents (chain);

create table if not exists public.indexer_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

GRANT ALL ON public.indexer_state TO service_role;

ALTER TABLE public.indexer_state ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_indexer_state_updated_at ON public.indexer_state;
CREATE TRIGGER set_indexer_state_updated_at
  BEFORE UPDATE ON public.indexer_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.facilitators DROP CONSTRAINT IF EXISTS facilitators_chain_address_key;
CREATE UNIQUE INDEX IF NOT EXISTS facilitators_chain_address_uniq
  ON public.facilitators (chain, address) WHERE address <> '';

insert into public.facilitators (id, name, chain, address, scheme, source_url, active)
values
  ('cdp-base', 'Coinbase CDP Facilitator (Base)', 'base', '', 'exact',
   'https://docs.cdp.coinbase.com/x402', false),
  ('payai-base', 'PayAI Facilitator (Base)', 'base', '', 'exact',
   'https://docs.payai.network/x402/reference', false)
on conflict (id) do nothing;