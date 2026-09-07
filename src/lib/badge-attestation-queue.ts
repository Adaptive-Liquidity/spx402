import type { AttestationKind } from "./eas.server";

// Pending badge_activated attestation retry queue.
//
// Context: subscribeBadge stamps an activation attestation inline. If that
// stamp is skipped (withheld-state lookup failure, chain hiccup), the
// scoring sweep never retries it (it only retries grade-change stamps).
// This module persists the pending work and lets the attester-health sweep
// process it independently of grades.
//
// Pure business rules live here with an injectable store so tests never
// touch Supabase. Only serializable data crosses the boundary.

export const ACTIVATION_KIND: AttestationKind = "badge_activated";

/** Base delay 5 min, doubling per attempt, capped at 24h. Pure. */
export function retryDelayMs(attempts: number): number {
  const base = 5 * 60 * 1000;
  const cap = 24 * 60 * 60 * 1000;
  const shift = Math.min(Math.max(0, attempts), 10);
  return Math.min(base * 2 ** shift, cap);
}

export interface PendingActivationRow {
  mint: string;
  kind: string;
  attempts: number;
  next_retry_at: string;
  last_error: string | null;
}

export interface ActivationQueueStore {
  read(mint: string): Promise<PendingActivationRow | null>;
  upsert(row: PendingActivationRow): Promise<void>;
  due(nowIso: string, limit: number): Promise<PendingActivationRow[]>;
  remove(mint: string): Promise<void>;
}

export interface ActivationAgentSnapshot {
  grade: string | null;
  score: number | null;
  withheldReason: string | null;
}

/** Grade string stamped for activation attestations. Never a fabricated grade. */
export function activationGradeLabel(snap: {
  grade: string | null;
  withheldReason: string | null;
}): string {
  if (snap.withheldReason != null) return "WITHHELD";
  return snap.grade ?? "SPX404";
}

export async function enqueueActivationRetry(
  store: ActivationQueueStore,
  mint: string,
  lastError: string,
  nowMs = Date.now(),
): Promise<void> {
  const existing = await store.read(mint);
  const attempts = (existing?.attempts ?? 0) + 1;
  await store.upsert({
    mint,
    kind: ACTIVATION_KIND,
    attempts,
    next_retry_at: new Date(nowMs + retryDelayMs(attempts)).toISOString(),
    last_error: lastError.slice(0, 500),
  });
}

export interface ActivationProcessorDeps {
  store: ActivationQueueStore;
  readAgent: (mint: string) => Promise<ActivationAgentSnapshot | null>;
  attest: (mint: string, grade: string, score: number) => Promise<{ ok: boolean; error?: string }>;
  nowMs?: number;
}

export interface ActivationProcessResult {
  processed: number;
  minted: number;
  rescheduled: number;
}

/**
 * Process due rows: re-read the agent (fresh grade/score/withheld state),
 * attest, delete on success, reschedule with backoff on failure. Withheld
 * agents are re-stamped as WITHHELD (honest metadata), never skipped
 * silently and never stamped with a stale grade.
 */
export async function processDueActivationRetries(
  deps: ActivationProcessorDeps,
): Promise<ActivationProcessResult> {
  const nowMs = deps.nowMs ?? Date.now();
  const due = await deps.store.due(new Date(nowMs).toISOString(), 100);
  let minted = 0;
  let rescheduled = 0;
  for (const row of due) {
    const snap = await deps.readAgent(row.mint);
    if (!snap) {
      await deps.store.remove(row.mint);
      continue;
    }
    const grade = activationGradeLabel(snap);
    const res = await deps.attest(row.mint, grade, snap.score ?? 0);
    if (res.ok) {
      await deps.store.remove(row.mint);
      minted++;
    } else {
      const attempts = row.attempts + 1;
      await deps.store.upsert({
        ...row,
        attempts,
        next_retry_at: new Date(nowMs + retryDelayMs(attempts)).toISOString(),
        last_error: (res.error ?? "attest failed").slice(0, 500),
      });
      rescheduled++;
    }
  }
  return { processed: due.length, minted, rescheduled };
}
