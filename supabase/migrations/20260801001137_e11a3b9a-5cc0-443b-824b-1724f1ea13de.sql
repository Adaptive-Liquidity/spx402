-- Facilitator registry — DB-overridable without redeploy.
create table if not exists public.facilitators (
  id text primary key,                      -- "cdp-solana"
  name text not null,
  chain text not null check (chain in ('solana','base')),
  address text not null,
  scheme text not null default 'exact',
  source_url text,                          -- operator page publishing the address
  fixture_id text,                          -- fixture proving detection; gate for active
  active boolean not null default false,    -- NEVER true without fixture_id
  first_seen_at timestamptz not null default now(),
  unique (chain, address)
);

grant select on public.facilitators to anon, authenticated;
grant all on public.facilitators to service_role;

alter table public.facilitators enable row level security;

-- Registry is public methodology: anyone can audit WHO we trust.
create policy "Facilitators publicly readable"
  on public.facilitators for select
  to anon, authenticated
  using (true);
-- Writes: service role only (no policy = no writes for anon/authenticated).

-- Guardrail: enforce the fixture gate at the database layer.
create or replace function public._facilitator_activation_guard()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if new.active = true and (new.fixture_id is null or new.address = '') then
    raise exception 'facilitator cannot be active without address + fixture_id';
  end if;
  return new;
end $$;

revoke all on function public._facilitator_activation_guard() from public, anon, authenticated;

create trigger facilitator_activation_guard
  before insert or update on public.facilitators
  for each row execute function public._facilitator_activation_guard();
