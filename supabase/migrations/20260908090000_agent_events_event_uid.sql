-- Durable idempotency for agent_events.
-- One Solana signature can decode into multiple event classes (deposit + AEON
-- instruction, or issue_authority + BOND_DEPOSITED). Unique(signature) collapsed
-- those into a single row. event_uid is signature:ix:disc:type:mint.

ALTER TABLE public.agent_events
  ADD COLUMN IF NOT EXISTS event_uid text;

UPDATE public.agent_events
SET event_uid = signature || ':x:none:' || type || ':' || mint
WHERE event_uid IS NULL;

ALTER TABLE public.agent_events
  ALTER COLUMN event_uid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agent_events_event_uid_key
  ON public.agent_events (event_uid);

ALTER TABLE public.agent_events
  DROP CONSTRAINT IF EXISTS agent_events_signature_key;

CREATE INDEX IF NOT EXISTS agent_events_signature_idx
  ON public.agent_events (signature);
