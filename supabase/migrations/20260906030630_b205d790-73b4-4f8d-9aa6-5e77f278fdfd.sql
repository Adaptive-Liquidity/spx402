CREATE TABLE public.preflight_scan (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  host text NOT NULL,
  url_key text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  probe_kind text NOT NULL DEFAULT 'challenge',
  outcome text NOT NULL,
  http_status integer,
  challenge_valid boolean,
  challenge_json jsonb,
  second_http_status integer,
  price_changed boolean,
  pay_to_changed boolean,
  pay_to text,
  network text,
  asset text,
  amount_usd numeric,
  x402_version integer,
  transport_note text,
  peer_sample_size integer,
  peer_median_usd numeric,
  price_outlier boolean,
  notes text,
  CONSTRAINT preflight_scan_probe_kind_chk CHECK (probe_kind = 'challenge')
);

CREATE INDEX preflight_scan_url_key_idx ON public.preflight_scan (url_key, scanned_at DESC);
CREATE INDEX preflight_scan_scanned_at_idx ON public.preflight_scan (scanned_at DESC);
CREATE INDEX preflight_scan_outcome_idx ON public.preflight_scan (outcome);

GRANT SELECT ON public.preflight_scan TO anon;
GRANT SELECT ON public.preflight_scan TO authenticated;
GRANT ALL ON public.preflight_scan TO service_role;

ALTER TABLE public.preflight_scan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Preflight scans are publicly readable"
  ON public.preflight_scan FOR SELECT
  USING (true);

CREATE VIEW public.preflight_scan_public
WITH (security_invoker = true) AS
SELECT
  id, url, host, url_key, scanned_at, probe_kind, outcome, http_status,
  challenge_valid, second_http_status, price_changed, pay_to_changed,
  pay_to, network, asset, amount_usd, x402_version, transport_note,
  peer_sample_size, peer_median_usd, price_outlier, notes
FROM public.preflight_scan;

GRANT SELECT ON public.preflight_scan_public TO anon;
GRANT SELECT ON public.preflight_scan_public TO authenticated;
GRANT ALL ON public.preflight_scan_public TO service_role;