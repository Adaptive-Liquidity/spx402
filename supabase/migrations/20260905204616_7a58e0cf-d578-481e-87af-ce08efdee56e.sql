CREATE TABLE public.badge_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mint text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('standard','premium')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','lapsed')),
  tx_hash text NOT NULL UNIQUE,
  payer text,
  amount_usdc bigint NOT NULL,
  granted_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badge_subscriptions TO anon;
GRANT SELECT ON public.badge_subscriptions TO authenticated;
GRANT ALL ON public.badge_subscriptions TO service_role;
ALTER TABLE public.badge_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badge subscriptions are public proof" ON public.badge_subscriptions FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX badge_subscriptions_mint_status ON public.badge_subscriptions (mint, status, granted_until);

CREATE TABLE public.attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mint text NOT NULL,
  kind text NOT NULL,
  schema_uid text NOT NULL,
  attestation_uid text NOT NULL UNIQUE,
  tx_hash text,
  attester text NOT NULL,
  grade text,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.attestations TO anon;
GRANT SELECT ON public.attestations TO authenticated;
GRANT ALL ON public.attestations TO service_role;
ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attestations are public proof" ON public.attestations FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX attestations_mint_created ON public.attestations (mint, created_at DESC);

CREATE TABLE public.eas_schema (
  schema_key text PRIMARY KEY,
  schema_uid text NOT NULL,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.eas_schema TO service_role;
ALTER TABLE public.eas_schema ENABLE ROW LEVEL SECURITY;