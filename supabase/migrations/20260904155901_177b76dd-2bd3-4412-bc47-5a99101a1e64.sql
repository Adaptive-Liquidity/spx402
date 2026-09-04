-- 1. AEON execution primitives on agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS aeon_cri_address text,
  ADD COLUMN IF NOT EXISTS total_slashed_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_bond_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escrow_success_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_escrows_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_escrows_failed integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS agents_aeon_cri_address_idx
  ON public.agents (aeon_cri_address)
  WHERE aeon_cri_address IS NOT NULL;

-- 2. AEON hash-chained receipts
CREATE TABLE IF NOT EXISTS public.aeon_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mint text NOT NULL,
  receipt_address text,
  sequence bigint NOT NULL DEFAULT 0,
  prev_hash text,
  receipt_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature text NOT NULL,
  slot bigint,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aeon_receipts_signature_hash_key UNIQUE (signature, receipt_hash)
);

CREATE INDEX IF NOT EXISTS aeon_receipts_mint_seq_idx
  ON public.aeon_receipts (mint, sequence DESC);

GRANT SELECT ON public.aeon_receipts TO anon;
GRANT SELECT ON public.aeon_receipts TO authenticated;
GRANT ALL ON public.aeon_receipts TO service_role;

ALTER TABLE public.aeon_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AEON receipts are publicly readable"
  ON public.aeon_receipts FOR SELECT
  USING (true);

-- 3. API keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'default',
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL DEFAULT '',
  tier text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  daily_limit integer NOT NULL DEFAULT 60,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_tier_check CHECK (tier IN ('free', 'pro', 'team')),
  CONSTRAINT api_keys_status_check CHECK (status IN ('active', 'revoked', 'expired'))
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own api keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON public.api_keys FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. API usage
CREATE TABLE IF NOT EXISTS public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  payer text,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_key_created_idx
  ON public.api_usage (api_key_id, created_at DESC);

GRANT SELECT ON public.api_usage TO authenticated;
GRANT ALL ON public.api_usage TO service_role;

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view usage for own api keys"
  ON public.api_usage FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.api_keys k
      WHERE k.id = api_usage.api_key_id AND k.user_id = auth.uid()
    )
  );

-- 5. Usage summary helper
CREATE OR REPLACE FUNCTION public.get_api_key_usage(p_key_id uuid)
RETURNS TABLE (used_today bigint, used_this_month bigint, total_calls bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::bigint,
    count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::bigint,
    count(*)::bigint
  FROM public.api_usage
  WHERE api_key_id = p_key_id
    AND EXISTS (
      SELECT 1 FROM public.api_keys k
      WHERE k.id = p_key_id
        AND (k.user_id = auth.uid() OR auth.role() = 'service_role')
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_api_key_usage(uuid) TO authenticated, service_role;