ALTER TABLE public.alert_subscriptions
  ADD COLUMN IF NOT EXISTS event_escrow_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_escrow_released boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_escrow_canceled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_bond_deposited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_bond_slashed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_receipt_created boolean NOT NULL DEFAULT false;