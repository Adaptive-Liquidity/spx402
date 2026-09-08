import { AGENT_EVENTS_ON_CONFLICT, eventUidFromRaw } from "./event-uid";

export { AGENT_EVENTS_ON_CONFLICT };

export interface AgentEventWrite {
  mint: string;
  type: string;
  severity: string;
  signature: string;
  slot?: number | null;
  occurredAt: string;
  amountSol: number;
  amountToken: number;
  raw?: Record<string, unknown>;
  eventUid?: string;
  chain?: string;
  parserVersion?: string;
}

/**
 * Shape written to agent_events. Includes event_uid for idempotency.
 * Cast at the call site (`as never`) until supabase gen types are regenerated.
 */
export function toAgentEventRow(e: AgentEventWrite): Record<string, unknown> {
  const raw = e.raw ?? {};
  return {
    mint: e.mint,
    type: e.type,
    severity: e.severity,
    signature: e.signature,
    slot: e.slot ?? undefined,
    occurred_at: e.occurredAt,
    amount_sol: e.amountSol,
    amount_token: e.amountToken,
    raw: raw as never,
    event_uid:
      e.eventUid ??
      eventUidFromRaw({
        signature: e.signature,
        type: e.type,
        mint: e.mint,
        raw,
      }),
    ...(e.chain ? { chain: e.chain } : {}),
    ...(e.parserVersion ? { parser_version: e.parserVersion } : {}),
  };
}
