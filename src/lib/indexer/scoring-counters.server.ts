// Scoring counter aggregation. Server-only.
//
// Reads agent_events for one subject and derives the counter set the scoring
// cron persists. FAIL CLOSED: a transient PostgREST error — or a silently
// truncated AEON lifetime page (PostgREST caps every response at db-max-rows
// and supabase-js does not surface the 206 as an error) — must never become
// zeroed counters that get persisted, flip a grade, or trigger a false
// attestation. Any query failure throws CountersQueryError; the caller skips
// the agent for the run and leaves its previous grade untouched.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { aggregateOutcomeContractCounters } from "@/lib/indexer/oc-evidence.server";
import {
  AEON_COUNTER_TYPES,
  aggregateAeonCounters,
  isAeonCounterType,
} from "@/lib/indexer/aeon-counters";

/** Thrown when any scoring counter query fails or returns a truncated page. */
export class CountersQueryError extends Error {}

const KEYSET_PAGE_SIZE = 1000;
const KEYSET_MAX_PAGES = 50;

type WindowEventRow = {
  id?: string | null;
  type: string;
  severity: string | null;
  amount_sol: number | null;
  amount_token: number | null;
  occurred_at: string | null;
  raw: unknown;
};

/**
 * Fetch every lifetime AEON counter event for a subject, keyset-paginated on
 * the primary key (id ascending, id > cursor) so concurrent inserts can never
 * shift a page boundary. Throws CountersQueryError on any page error, a
 * missing cursor id, or page-cap exhaustion — never returns a partial set.
 */
async function fetchAeonCounterRows(
  client: SupabaseClient<Database>,
  mint: string,
): Promise<Array<{ type: string; amount_token: number | null }>> {
  const rows: Array<{ type: string; amount_token: number | null }> = [];
  let afterId: string | null = null;
  for (let page = 0; page < KEYSET_MAX_PAGES; page++) {
    let q = client
      .from("agent_events")
      .select("id, type, amount_token")
      .eq("mint", mint)
      .in("type", [...AEON_COUNTER_TYPES])
      .order("id", { ascending: true })
      .limit(KEYSET_PAGE_SIZE);
    if (afterId) q = q.gt("id", afterId);
    const { data, error } = await q;
    if (error) throw new CountersQueryError(error.message ?? "AEON counter query failed");
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < KEYSET_PAGE_SIZE) return rows;
    const cursor = batch[batch.length - 1]?.id;
    if (typeof cursor !== "string" || cursor.length === 0) {
      throw new CountersQueryError("AEON counter page missing id cursor");
    }
    afterId = cursor;
  }
  throw new CountersQueryError("AEON counter pagination exceeded page cap");
}

/**
 * Fetch the 30-day scoring window, keyset-paginated the same way as lifetime
 * AEON counters. Completeness is the exact PostgREST count vs accumulated rows.
 */
async function fetchWindowEventRows(
  client: SupabaseClient<Database>,
  mint: string,
  since: string,
): Promise<{ rows: WindowEventRow[]; complete: boolean }> {
  const rows: WindowEventRow[] = [];
  let expected: number | null = null;
  let afterId: string | null = null;
  for (let page = 0; page < KEYSET_MAX_PAGES; page++) {
    let q = client
      .from("agent_events")
      .select("id, type, severity, amount_sol, amount_token, occurred_at, raw", {
        count: "exact",
      })
      .eq("mint", mint)
      .gte("occurred_at", since)
      .order("id", { ascending: true })
      .limit(KEYSET_PAGE_SIZE);
    if (afterId) q = q.gt("id", afterId);
    const { data, error, count } = await q;
    if (error) throw new CountersQueryError(error.message ?? "30-day window query failed");
    if (afterId === null && typeof count === "number") expected = count;
    const batch = (data ?? []) as WindowEventRow[];
    rows.push(...batch);
    if (batch.length < KEYSET_PAGE_SIZE) {
      if (expected !== null && rows.length !== expected) {
        throw new CountersQueryError(
          `30-day event window truncated: ${rows.length}/${expected} rows`,
        );
      }
      return { rows, complete: expected === rows.length };
    }
    const cursor = batch[batch.length - 1]?.id;
    if (typeof cursor !== "string" || cursor.length === 0) {
      throw new CountersQueryError("30-day window page missing id cursor");
    }
    afterId = cursor;
  }
  throw new CountersQueryError("30-day window pagination exceeded page cap");
}

export async function aggregateCounters(client: SupabaseClient<Database>, mint: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Window first so a truncated 30-day set fails closed before lifetime AEON
  // pages run. Latest/first/AEON then load in parallel.
  const window = await fetchWindowEventRows(client, mint, since);
  const rows = window.rows;
  const [latestResult, firstResult, aeonRows] = await Promise.all([
    client
      .from("agent_events")
      .select("occurred_at")
      .eq("mint", mint)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // First-ever event for this subject — drives the observation_window
    // confidence factor. Cheap with the (mint, occurred_at) index.
    client
      .from("agent_events")
      .select("occurred_at")
      .eq("mint", mint)
      .order("occurred_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // AEON bond/escrow state is lifetime, not a 30-day window. Fully
    // keyset-paginated: a single page would silently truncate at db-max-rows,
    // and failing permanently once an agent crosses the cap is not an option.
    fetchAeonCounterRows(client, mint),
  ]);

  const queryError = latestResult.error ?? firstResult.error;
  if (queryError) {
    throw new CountersQueryError(queryError.message ?? "agent_events counter query failed");
  }

  const latest = latestResult.data;
  const first = firstResult.data;
  const outcomeEvidenceComplete = window.complete;
  const deposits = rows.filter((r) => r.type === "DEPOSIT_RECEIVED");
  const buybacks = rows.filter((r) => r.type === "BUYBACK_EXECUTED");
  const burns = rows.filter((r) => r.type === "BURN_CONFIRMED");
  const swaps = rows.filter((r) => r.type === "SWAP_EXECUTED");
  const x402 = rows.filter((r) => r.type === "X402_PAYMENT_RECEIVED");
  const outcome = aggregateOutcomeContractCounters(rows);
  const totalDepositsCount = deposits.length;
  const totalBuybacksCount = buybacks.length;
  const totalBurnsCount = burns.length;
  // Legacy: only the original FAILED_WINDOW + ANOMALY counters feed the
  // risk-score branch. The Wave 1b negative-event taxonomy is summed
  // separately below so confidence can grow without inflating risk twice.
  const failedWindows = rows.filter(
    (r) => r.type === "FAILED_WINDOW" || r.type === "ANOMALY_DETECTED",
  ).length;
  const failedNegativeCount = rows.filter((r) =>
    [
      "FAILED_BUYBACK_WINDOW",
      "PROMISED_BUYBACK_NOT_SETTLED",
      "X402_PAYMENT_REVERTED",
      "WINDOW_MISSED",
    ].includes(r.type),
  ).length;

  const totalDepositedSol = deposits.reduce((acc, r) => acc + Number(r.amount_sol ?? 0), 0);
  const totalBuybackSol = buybacks.reduce((acc, r) => acc + Number(r.amount_sol ?? 0), 0);
  const totalBurnedTokens = burns.reduce((acc, r) => acc + Number(r.amount_token ?? 0), 0);

  // Generalized swap counters (used for executor categories).
  const totalSwapCount = swaps.length;
  const totalSwapSol = swaps.reduce((acc, r) => acc + Number(r.amount_sol ?? 0), 0);

  // x402 receipt counters. amount_token holds USDC raw units when the
  // receipt was USDC-denominated (see decode-x402.server.ts).
  const totalX402Count = x402.length;
  const totalX402Sol = x402.reduce((acc, r) => acc + Number(r.amount_sol ?? 0), 0);
  const totalX402Usdc = x402.reduce((acc, r) => acc + Number(r.amount_token ?? 0), 0);

  const buybackExecutionRate =
    totalDepositsCount === 0 ? 0 : Math.min(1, totalBuybacksCount / totalDepositsCount);
  const burnConfirmationRate =
    totalBuybacksCount === 0 ? 0 : Math.min(1, totalBurnsCount / totalBuybacksCount);

  const lastIso = latest?.occurred_at ?? null;
  const lastIndexedSeconds = lastIso
    ? Math.max(0, Math.floor((Date.now() - new Date(lastIso).getTime()) / 1000))
    : 60 * 60 * 24 * 30;

  // Distinct event types for confidence: 30-day window only. Lifetime AEON
  // types stay on grade/persisted columns and must not inflate this set.
  const distinctEventTypes = new Set(rows.map((r) => r.type)).size;

  // Observation window: seconds since the very first event for this subject.
  const firstIso = first?.occurred_at ?? null;
  const observationWindowSeconds = firstIso
    ? Math.max(0, Math.floor((Date.now() - new Date(firstIso).getTime()) / 1000))
    : 0;
  const aeon = aggregateAeonCounters(aeonRows);
  const windowAeon = aggregateAeonCounters(rows.filter((r) => isAeonCounterType(r.type)));
  return {
    totalDepositsCount,
    totalBuybacksCount,
    totalBurnsCount,
    totalDepositedSol,
    totalBuybackSol,
    totalBurnedTokens,
    failedWindows,
    buybackExecutionRate,
    burnConfirmationRate,
    lastIndexedSeconds,
    totalSwapCount,
    totalSwapSol,
    totalX402Count,
    totalX402Sol,
    totalX402Usdc,
    failedNegativeCount,
    distinctEventTypes,
    observationWindowSeconds,
    ...outcome,
    outcomeEvidenceComplete,
    ...aeon,
    windowAeon,
  };
}
