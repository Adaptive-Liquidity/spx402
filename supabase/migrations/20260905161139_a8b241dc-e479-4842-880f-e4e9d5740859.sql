alter table public.profiles add column if not exists base_wallet text;

create unique index if not exists profiles_base_wallet_unique on public.profiles (lower(base_wallet)) where base_wallet is not null;

create table public.wallet_auth_nonces (
  wallet text primary key,
  nonce text not null,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null
);

grant all on public.wallet_auth_nonces to service_role;

alter table public.wallet_auth_nonces enable row level security;
-- No policies: server-only table accessed exclusively via the service role.
-- Anyone holding a nonce still cannot sign in without the wallet's signature.