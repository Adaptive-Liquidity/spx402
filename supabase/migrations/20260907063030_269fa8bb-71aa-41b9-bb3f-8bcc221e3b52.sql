CREATE TABLE public.agent_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  agent_name text NOT NULL,
  agent_description text,
  agent_type text NOT NULL DEFAULT 'aeon_spx402_wallet',
  category text NOT NULL DEFAULT 'general',
  ecosystem text NOT NULL DEFAULT 'solana',
  website_url text,
  contact text,

  legal_owner_type text NOT NULL DEFAULT 'unknown',
  legal_owner_name text,

  aeon_identity_status text NOT NULL DEFAULT 'not_connected',
  aeon_cri text,
  aeon_executor_wallet text,
  aeon_program_address text,
  controller_wallet text,
  operator_signer_wallet text,

  spx402_wallet_status text NOT NULL DEFAULT 'missing',
  spx402_wallet_address text,
  income_wallet_address text,
  treasury_wallet_address text,
  recovery_admin_wallet text,
  wallet_custody_type text NOT NULL DEFAULT 'unknown',
  income_routing_status text NOT NULL DEFAULT 'missing',
  route_all_income_to_treasury boolean NOT NULL DEFAULT false,
  routing_change_authority text NOT NULL DEFAULT 'owner_only',

  operator_verification_status text NOT NULL DEFAULT 'unverified',

  visibility_status text NOT NULL DEFAULT 'private',
  publication_status text NOT NULL DEFAULT 'unpublished',
  publication_intent text NOT NULL DEFAULT 'keep_private',
  registration_status text NOT NULL DEFAULT 'draft',

  subject_identifier text,
  identifier_kind text,

  disclosure_operates_agent boolean,
  disclosure_financial_interest boolean,
  disclosure_token_now_or_planned boolean,
  disclosure_holds_or_trades_token boolean,
  disclosure_issuer_operated_counterparty boolean,
  disclosure_independent_counterparty boolean,
  disclosure_issuer_operates_rails boolean,
  disclosure_program_upgrade_authority boolean,
  disclosure_upgrade_authority_controller text,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX agent_registrations_user_id_idx ON public.agent_registrations (user_id);
CREATE INDEX agent_registrations_public_idx ON public.agent_registrations (visibility_status, publication_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_registrations TO authenticated;
GRANT SELECT ON public.agent_registrations TO anon;
GRANT ALL ON public.agent_registrations TO service_role;

ALTER TABLE public.agent_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own registrations"
  ON public.agent_registrations FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Published public registrations are readable by anyone"
  ON public.agent_registrations FOR SELECT
  USING (visibility_status = 'public' AND publication_status = 'published');

CREATE TRIGGER set_agent_registrations_updated_at
  BEFORE UPDATE ON public.agent_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();