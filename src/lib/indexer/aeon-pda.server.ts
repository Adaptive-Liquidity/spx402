// AEON identity helpers: persist issue_authority PDAs on the agent row,
// and decide whether an unmatched slash_bond must retry (500) or drop (200).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aeonInstructionName,
  decodeInstructionDataBytes,
} from "./aeon-idl";
import type { AeonDecodedEvent } from "./decode-aeon.server";
import { flattenInstructions, type HeliusEnhancedTx } from "./helius.server";
import type { AeonAgentRow } from "./aeon-lookup.server";

export function uniqueAddrs(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function emptyPdaArrays(row: AeonAgentRow): boolean {
  const authorities = row.aeon_authority_addresses ?? [];
  const bonds = row.aeon_bond_addresses ?? [];
  return authorities.length === 0 && bonds.length === 0;
}

export interface PdaUpdate {
  authorities: string[];
  bonds: string[];
  identity: string | null;
}

/** Collect authority/bond/identity PDAs from decoded issue_authority events. */
export function issueAuthorityPdaUpdates(events: AeonDecodedEvent[]): Map<string, PdaUpdate> {
  const byMint = new Map<string, PdaUpdate>();
  for (const event of events) {
    if (event.type !== "AEON_AUTHORITY_ISSUED" && event.type !== "BOND_DEPOSITED") continue;
    if (event.raw.instruction !== "issue_authority") continue;
    const authority = typeof event.raw.authority === "string" ? event.raw.authority : null;
    const bond = typeof event.raw.bond === "string" ? event.raw.bond : null;
    const identity = typeof event.raw.agent_identity === "string" ? event.raw.agent_identity : null;
    const current = byMint.get(event.mint) ?? { authorities: [], bonds: [], identity: null };
    current.authorities = uniqueAddrs([...current.authorities, authority]);
    current.bonds = uniqueAddrs([...current.bonds, bond]);
    if (!current.identity && identity) current.identity = identity;
    byMint.set(event.mint, current);
  }
  return byMint;
}

export async function persistIssueAuthorityPdas(
  admin: Pick<SupabaseClient, "rpc">,
  events: AeonDecodedEvent[],
): Promise<void> {
  const updates = issueAuthorityPdaUpdates(events);
  for (const [mint, pdas] of updates) {
    if (pdas.authorities.length === 0 && pdas.bonds.length === 0 && !pdas.identity) continue;
    const { error } = await admin.rpc("append_aeon_issue_authority_pdas", {
      p_mint: mint,
      p_authorities: pdas.authorities,
      p_bonds: pdas.bonds,
      p_identity: pdas.identity,
    });
    if (error) throw new Error(`AEON PDA persist failed for ${mint}: ${error.message}`);
  }
}

function isSlashBondIx(programId: string, data: string | undefined): boolean {
  if (!data) return false;
  const bytes = decodeInstructionDataBytes(data);
  if (!bytes || bytes.length < 8) return false;
  return aeonInstructionName(bytes.subarray(0, 8).toString("hex")) === "slash_bond";
}

/**
 * Retryable 500 only when an AEON slash_bond did not attribute and at least
 * one aeon_executor still has empty PDA arrays (pending issue_authority).
 * If every aeon_executor already has PDAs and none match → do not retry.
 */
export function shouldRetryUnresolvedSlash(
  txs: HeliusEnhancedTx[],
  decoded: AeonDecodedEvent[],
  aeonRows: AeonAgentRow[],
  programId: string,
): boolean {
  const executors = aeonRows.filter((row) => row.category === "aeon_executor");
  if (executors.length === 0) return false;
  if (!executors.some(emptyPdaArrays)) return false;

  const attributed = new Set(
    decoded
      .filter((event) => event.type === "BOND_SLASHED")
      .map((event) => `${event.signature}:${String(event.raw.ixIndex ?? "")}`),
  );

  for (const tx of txs) {
    if (tx.transactionError) continue;
    const sig = tx.signature ?? "";
    if (!sig) continue;
    const flat = flattenInstructions(tx.instructions ?? []);
    for (let ixIndex = 0; ixIndex < flat.length; ixIndex++) {
      const ix = flat[ixIndex];
      if (ix.programId !== programId || !isSlashBondIx(programId, ix.data)) continue;
      if (!attributed.has(`${sig}:${ixIndex}`)) return true;
    }
  }
  return false;
}
