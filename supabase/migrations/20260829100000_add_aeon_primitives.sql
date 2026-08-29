-- =========================================================
-- AEON Integration: Schema Extensions
-- =========================================================

-- Add AEON primitives to agents table
alter table public.agents 
add column aeon_cri_address text,
add column total_slashed_usd numeric not null default 0,
add column active_bond_amount numeric not null default 0,
add column escrow_success_rate numeric not null default 0,
add column total_escrows_completed integer not null default 0,
add column total_escrows_failed integer not null default 0;

create index idx_agents_aeon_cri on public.agents (aeon_cri_address);

-- AEON Receipts table for hash-chained execution proof
create table public.aeon_receipts (
  id uuid primary key default gen_random_uuid(),
  agent_mint text not null references public.agents(mint) on delete cascade,
  receipt_hash text not null unique,
  event_type text not null, -- e.g., 'escrow_completed', 'bond_slashed', 'bond_deposited'
  amount_usd numeric,
  transaction_signature text not null,
  created_at timestamptz not null default now()
);

alter table public.aeon_receipts enable row level security;

create policy "AEON receipts are publicly readable"
on public.aeon_receipts
for select
using (true);

create index idx_aeon_receipts_agent on public.aeon_receipts (agent_mint);
create index idx_aeon_receipts_type on public.aeon_receipts (event_type);
