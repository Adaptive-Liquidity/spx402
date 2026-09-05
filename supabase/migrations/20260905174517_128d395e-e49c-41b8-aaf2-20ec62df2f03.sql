CREATE TABLE public.plan_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_key_id uuid,
  tx_hash text not null unique,
  chain text not null default 'base',
  payer text,
  amount_usdc bigint not null,
  plan text not null,
  granted_until timestamptz not null,
  created_at timestamptz not null default now()
);

CREATE INDEX plan_purchases_user_idx ON public.plan_purchases (user_id, created_at desc);

GRANT SELECT ON public.plan_purchases TO authenticated;
GRANT ALL ON public.plan_purchases TO service_role;

ALTER TABLE public.plan_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own purchases"
ON public.plan_purchases FOR SELECT TO authenticated
USING (auth.uid() = user_id);