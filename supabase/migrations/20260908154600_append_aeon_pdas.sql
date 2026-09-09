-- Atomic append of issue_authority PDAs. Replaces SELECT → JS merge → UPDATE
-- so concurrent webhook/backfill writers cannot clobber arrays.
-- Matches rate_limit_hit: SECURITY DEFINER, search_path = public, service_role only.

CREATE OR REPLACE FUNCTION public.append_aeon_issue_authority_pdas(
  p_mint text,
  p_authorities text[],
  p_bonds text[],
  p_identity text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.agents
  SET
    aeon_authority_addresses = ARRAY(
      SELECT DISTINCT u
      FROM unnest(
        coalesce(aeon_authority_addresses, '{}'::text[])
        || coalesce(p_authorities, '{}'::text[])
      ) AS u
      WHERE u IS NOT NULL AND btrim(u) <> ''
    ),
    aeon_bond_addresses = ARRAY(
      SELECT DISTINCT u
      FROM unnest(
        coalesce(aeon_bond_addresses, '{}'::text[])
        || coalesce(p_bonds, '{}'::text[])
      ) AS u
      WHERE u IS NOT NULL AND btrim(u) <> ''
    ),
    aeon_agent_identity = CASE
      WHEN aeon_agent_identity IS NULL
        AND p_identity IS NOT NULL
        AND btrim(p_identity) <> ''
      THEN p_identity
      ELSE aeon_agent_identity
    END
  WHERE mint = p_mint;
$$;

REVOKE ALL ON FUNCTION public.append_aeon_issue_authority_pdas(text, text[], text[], text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_aeon_issue_authority_pdas(text, text[], text[], text)
  TO service_role;
