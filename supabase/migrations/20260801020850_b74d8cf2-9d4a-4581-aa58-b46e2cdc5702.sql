CREATE TABLE public.x402_service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE,
  slug text UNIQUE,
  pay_to text,
  chain text NOT NULL DEFAULT 'solana',
  facilitator text,
  advertised_asset text,
  advertised_amount_usd numeric,
  discovered_via text NOT NULL,
  probe_tier text NOT NULL DEFAULT 'tail',
  active boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_probe_at timestamptz,
  last_challenge_probe_at timestamptz,
  last_settlement_probe_at timestamptz
);

GRANT SELECT ON public.x402_service TO anon, authenticated;
GRANT ALL ON public.x402_service TO service_role;

ALTER TABLE public.x402_service ENABLE ROW LEVEL SECURITY;

CREATE POLICY "x402 services are publicly readable"
  ON public.x402_service FOR SELECT
  USING (true);

CREATE INDEX x402_service_tier_active_idx ON public.x402_service (probe_tier, active, last_probe_at NULLS FIRST);
CREATE INDEX x402_service_pay_to_idx ON public.x402_service (pay_to);

CREATE TABLE public.probe_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.x402_service(id) ON DELETE CASCADE,
  probe_kind text NOT NULL,
  outcome text NOT NULL,
  challenge_valid boolean,
  challenge_json jsonb,
  paid_amount_usd numeric,
  tx_signature text,
  verify_ms integer,
  settle_ms integer,
  http_status integer,
  delivered boolean,
  prober_wallet text,
  chain text NOT NULL DEFAULT 'solana',
  notes text,
  ran_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.probe_run TO anon, authenticated;
GRANT ALL ON public.probe_run TO service_role;

ALTER TABLE public.probe_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Probe runs are publicly readable"
  ON public.probe_run FOR SELECT
  USING (true);

CREATE INDEX probe_run_service_ran_idx ON public.probe_run (service_id, ran_at DESC);
CREATE INDEX probe_run_ran_at_idx ON public.probe_run (ran_at DESC);
CREATE INDEX probe_run_tx_signature_idx ON public.probe_run (tx_signature) WHERE tx_signature IS NOT NULL;