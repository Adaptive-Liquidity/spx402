-- Pending badge_activated attestation retry queue (trust-engine).
--
-- A badge subscription can go active while its activation attestation is
-- skipped (e.g. withheld-state lookup failure). The scoring sweep only
-- retries grade-change attestations, so without this table a skipped
-- activation stamp would stay missing for the whole paid period.
-- The attester-health sweep processes due rows independently of grades.
--
-- ROLLOUT CONTRACT: apply before deploying code that enqueues. No index
-- beyond the PK is needed at current volume; revisit if the sweep scans slow.

CREATE TABLE IF NOT EXISTS public.badge_attestation_queue (
  mint text PRIMARY KEY,
  kind text NOT NULL DEFAULT 'badge_activated',
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_attestation_queue ENABLE ROW LEVEL SECURITY;

-- Service-role only: no public read. Operational queue, not a public surface.
CREATE POLICY badge_attestation_queue_no_public ON public.badge_attestation_queue
  FOR ALL USING (false);


CREATE TRIGGER set_badge_attestation_queue_updated_at
  BEFORE UPDATE ON public.badge_attestation_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
