// Webhook AEON lookup: attach authority/bond PDAs so slash_bond can resolve
// to the bonded agent instead of any tracked wallet in the instruction.

import {
  aeonInstructionName,
  decodeAeonArgs,
  decodeInstructionDataBytes,
  namedIssueAuthorityAccounts,
} from "./aeon-idl";
import { decodeAeonTx, type AeonDecodedEvent, type AeonLookup } from "./decode-aeon.server";
import { flattenInstructions, type HeliusEnhancedTx } from "./helius.server";

export const AEON_OWNERSHIP_EVENT_TYPES = ["AEON_AUTHORITY_ISSUED", "BOND_DEPOSITED"] as const;

export interface AeonAgentRow {
  mint: string;
  aeon_cri_address?: string | null;
  executor_wallet?: string | null;
}

export interface AeonOwnershipEventRow {
  mint: string;
  type: string;
  raw: unknown;
}

interface OwnershipPdas {
  authorities: Set<string>;
  bonds: Set<string>;
}

function emptyOwnership(): OwnershipPdas {
  return { authorities: new Set(), bonds: new Set() };
}

function addPda(set: Set<string>, value: unknown): void {
  if (typeof value === "string" && value.length > 0) set.add(value);
}

function accountList(raw: Record<string, unknown>): string[] {
  if (!Array.isArray(raw.accounts)) return [];
  return raw.accounts.filter((item): item is string => typeof item === "string");
}

function parsedArgs(raw: Record<string, unknown>): Record<string, unknown> | null {
  const parsed = raw.parsedData;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

/** Pull authority/bond PDAs from a persisted issue_authority event row. */
export function ownershipPdasFromEventRaw(raw: unknown): { authority?: string; bond?: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const named =
    record.instruction === "issue_authority"
      ? namedIssueAuthorityAccounts(accountList(record), parsedArgs(record))
      : {};
  const authority =
    typeof record.authority === "string" && record.authority ? record.authority : named.authority;
  const bond = typeof record.bond === "string" && record.bond ? record.bond : named.bond;
  return { authority, bond };
}

function mergeOwnership(into: Map<string, OwnershipPdas>, mint: string, pdas: { authority?: string; bond?: string }) {
  const current = into.get(mint) ?? emptyOwnership();
  addPda(current.authorities, pdas.authority);
  addPda(current.bonds, pdas.bond);
  into.set(mint, current);
}

function ownershipFromPersistedEvents(rows: AeonOwnershipEventRow[]): Map<string, OwnershipPdas> {
  const byMint = new Map<string, OwnershipPdas>();
  for (const row of rows) {
    if (!(AEON_OWNERSHIP_EVENT_TYPES as readonly string[]).includes(row.type)) continue;
    mergeOwnership(byMint, row.mint, ownershipPdasFromEventRaw(row.raw));
  }
  return byMint;
}

function ownershipFromIssueAuthorityTxs(
  txs: HeliusEnhancedTx[],
  agents: AeonLookup[],
  programId: string,
): Map<string, OwnershipPdas> {
  const byMint = new Map<string, OwnershipPdas>();
  for (const tx of txs) {
    for (const ix of flattenInstructions(tx.instructions ?? [])) {
      if (ix.programId !== programId || !ix.data) continue;
      const bytes = decodeInstructionDataBytes(ix.data);
      if (!bytes || bytes.length < 8) continue;
      if (aeonInstructionName(bytes.subarray(0, 8).toString("hex")) !== "issue_authority") continue;
      const parsed = decodeAeonArgs("issue_authority", bytes);
      const named = namedIssueAuthorityAccounts(ix.accounts ?? [], parsed);
      const accounts = new Set(ix.accounts ?? []);
      for (const agent of agents) {
        const cri = agent.aeonCriAddress;
        const wallet = agent.executorWallet;
        if (!((cri && accounts.has(cri)) || (wallet && accounts.has(wallet)))) continue;
        mergeOwnership(byMint, agent.mint, { authority: named.authority, bond: named.bond });
      }
    }
  }
  return byMint;
}

function applyOwnership(agent: AeonLookup, pdas: OwnershipPdas | undefined): AeonLookup {
  if (!pdas || (pdas.authorities.size === 0 && pdas.bonds.size === 0)) return agent;
  const authorities = [...pdas.authorities];
  const bonds = [...pdas.bonds];
  return {
    ...agent,
    aeonAuthorityAddress: authorities[0] ?? agent.aeonAuthorityAddress ?? null,
    aeonBondAddress: bonds[0] ?? agent.aeonBondAddress ?? null,
    aeonAuthorityAddresses: authorities,
    aeonBondAddresses: bonds,
  };
}

/**
 * Build the webhook AEON lookup: CRI/wallet plus authority/bond PDAs from
 * persisted issue_authority events and issue_authority ixs in this batch.
 */
export function buildWebhookAeonLookup(
  agentRows: AeonAgentRow[],
  ownershipEvents: AeonOwnershipEventRow[],
  txs: HeliusEnhancedTx[],
  programId: string,
): AeonLookup[] {
  const base: AeonLookup[] = [];
  for (const row of agentRows) {
    const cri = row.aeon_cri_address ?? null;
    const wallet = row.executor_wallet ?? null;
    if (!cri && !wallet) continue;
    base.push({
      mint: row.mint,
      aeonCriAddress: cri,
      executorWallet: wallet,
    });
  }
  if (base.length === 0) return base;

  const persisted = ownershipFromPersistedEvents(ownershipEvents);
  const fromTxs = ownershipFromIssueAuthorityTxs(txs, base, programId);
  return base.map((agent) => {
    const merged = emptyOwnership();
    const hist = persisted.get(agent.mint);
    const live = fromTxs.get(agent.mint);
    if (hist) {
      for (const value of hist.authorities) merged.authorities.add(value);
      for (const value of hist.bonds) merged.bonds.add(value);
    }
    if (live) {
      for (const value of live.authorities) merged.authorities.add(value);
      for (const value of live.bonds) merged.bonds.add(value);
    }
    return applyOwnership(agent, merged);
  });
}

/** Decode AEON events using the same lookup the Helius webhook builds. */
export function decodeAeonWebhookBatch(
  txs: HeliusEnhancedTx[],
  agentRows: AeonAgentRow[],
  ownershipEvents: AeonOwnershipEventRow[],
  programId: string,
): AeonDecodedEvent[] {
  const lookup = buildWebhookAeonLookup(agentRows, ownershipEvents, txs, programId);
  if (lookup.length === 0) return [];
  const events: AeonDecodedEvent[] = [];
  for (const tx of txs) {
    events.push(...decodeAeonTx(tx, lookup, programId));
  }
  return events;
}
