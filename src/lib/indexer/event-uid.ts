/**
 * Durable idempotency key for agent_events.
 *
 * `signature` alone cannot be unique: one Solana tx can emit a deposit and an
 * AEON instruction (or two AEON events from issue_authority + bond).
 *
 * Canonical form: `${signature}:${ixIndex}:${discHex}:${type}:${mint}`
 * Decoders without an instruction index use `x` / `none`.
 */

export interface EventUidParts {
  signature: string;
  type: string;
  mint: string;
  ixIndex?: number | null;
  discHex?: string | null;
}

export function makeEventUid(parts: EventUidParts): string {
  const ix = parts.ixIndex == null ? "x" : String(parts.ixIndex);
  const disc = (parts.discHex ?? "none").toLowerCase();
  return `${parts.signature}:${ix}:${disc}:${parts.type}:${parts.mint}`;
}

export function eventUidFromRaw(
  parts: EventUidParts & { raw?: Record<string, unknown> },
): string {
  const raw = parts.raw ?? {};
  const ixIndex =
    parts.ixIndex ?? (typeof raw.ixIndex === "number" ? raw.ixIndex : null);
  const discHex =
    parts.discHex ?? (typeof raw.discriminator === "string" ? raw.discriminator : null);
  return makeEventUid({
    signature: parts.signature,
    type: parts.type,
    mint: parts.mint,
    ixIndex,
    discHex,
  });
}

/** PostgREST upsert target once 20260908090000_agent_events_event_uid.sql is applied. */
export const AGENT_EVENTS_ON_CONFLICT = "event_uid";
