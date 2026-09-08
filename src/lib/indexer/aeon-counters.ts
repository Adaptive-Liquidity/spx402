// Derive AEON scoring counters from decoded agent_events rows.
// Amounts in agent_events.amount_token are raw token units from IDL u64 args.
// The canonical AEON mint on the documented v0.2 devnet pay tx uses 6 decimals.

export const AEON_TOKEN_DECIMALS = 6;

export const AEON_COUNTER_TYPES = [
  "ESCROW_CREATED",
  "ESCROW_RELEASED",
  "ESCROW_CANCELED",
  "BOND_DEPOSITED",
  "BOND_SLASHED",
  "RECEIPT_CREATED",
  "AEON_PAYMENT",
] as const;

export type AeonCounterEventType = (typeof AEON_COUNTER_TYPES)[number];

export function isAeonCounterType(type: string): type is AeonCounterEventType {
  return (AEON_COUNTER_TYPES as readonly string[]).includes(type);
}

export interface AeonEventRow {
  type: string;
  amount_token?: number | string | null;
}

export interface AeonCounters {
  totalEscrowsCompleted: number;
  totalEscrowsFailed: number;
  escrowSuccessRate: number;
  activeBondAmount: number;
  totalSlashedUsd: number;
  totalAeonPayments: number;
  totalReceipts: number;
}

function tokenUnitsToDisplay(raw: number | string | null | undefined): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n / 10 ** AEON_TOKEN_DECIMALS;
}

/** Aggregate AEON execution counters from event rows (lifetime, not a 30-day window). */
export function aggregateAeonCounters(rows: AeonEventRow[]): AeonCounters {
  let created = 0;
  let released = 0;
  let canceled = 0;
  let receipts = 0;
  let payments = 0;
  let deposited = 0;
  let slashed = 0;

  for (const row of rows) {
    switch (row.type) {
      case "ESCROW_CREATED":
        created += 1;
        break;
      case "ESCROW_RELEASED":
        released += 1;
        break;
      case "ESCROW_CANCELED":
        canceled += 1;
        break;
      case "RECEIPT_CREATED":
        receipts += 1;
        break;
      case "AEON_PAYMENT":
        payments += 1;
        break;
      case "BOND_DEPOSITED":
        deposited += tokenUnitsToDisplay(row.amount_token);
        break;
      case "BOND_SLASHED":
        slashed += tokenUnitsToDisplay(row.amount_token);
        break;
      default:
        break;
    }
  }

  const failed = canceled;
  const completed = released;
  const settled = completed + failed;
  void created;

  return {
    totalEscrowsCompleted: completed,
    totalEscrowsFailed: failed,
    escrowSuccessRate: settled === 0 ? 0 : completed / settled,
    activeBondAmount: Math.max(0, deposited - slashed),
    totalSlashedUsd: slashed,
    totalAeonPayments: payments,
    totalReceipts: receipts,
  };
}
