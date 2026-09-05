insert into public.facilitators (id, name, chain, address, scheme, source_url, fixture_id, active)
values (
  'base-relay-1360',
  'Base x402 Relay (0x1360…66fa)',
  'base',
  '0x136008978ad053942dcdbe759a0903f5d84966fa',
  'exact',
  'https://basescan.org/address/0x136008978ad053942dcdbe759a0903f5d84966fa',
  'E1_facilitator_transfer_with_authorization',
  true
)
on conflict (id) do update set active = excluded.active, fixture_id = excluded.fixture_id, source_url = excluded.source_url;