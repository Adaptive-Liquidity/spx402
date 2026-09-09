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
  category?: string | null;
  aeon_cri_address?: string | null;
  executor_wallet?: string | null;
  aeon_agent_identity?: string | null;
  aeon_authority_addresses?: string[] | null;
  aeon_bond_addresses?: string[] | null;
}

export interface AeonOwnershipEventRow {
  /** Primary key — required while paginating (keyset cursor), optional elsewhere. */
  id?: string | null;
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

function mergeOwnership(
  into: Map<string, OwnershipPdas>,
  mint: string,
  pdas: { authority?: string; bond?: string },
) {
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
      for (const agent of agents) {
        const byWallet = Boolean(
          named.agent && agent.executorWallet && named.agent === agent.executorWallet,
        );
        const byIdentity = Boolean(
          named.agent_identity &&
            agent.aeonAgentIdentity &&
            named.agent_identity === agent.aeonAgentIdentity,
        );
        if (!byWallet && !byIdentity) continue;
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
    if (row.category !== "aeon_executor") continue;
    const cri = row.aeon_cri_address ?? null;
    const wallet = row.executor_wallet ?? null;
    if (!cri && !wallet && !row.aeon_agent_identity) continue;
    const authorities = (row.aeon_authority_addresses ?? []).filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    const bonds = (row.aeon_bond_addresses ?? []).filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    base.push({
      mint: row.mint,
      aeonCriAddress: cri,
      executorWallet: wallet,
      aeonAgentIdentity: row.aeon_agent_identity ?? null,
      aeonAuthorityAddress: authorities[0] ?? null,
      aeonBondAddress: bonds[0] ?? null,
      aeonAuthorityAddresses: authorities,
      aeonBondAddresses: bonds,
    });
  }
  if (base.length === 0) return base;

  const persisted = ownershipFromPersistedEvents(ownershipEvents);
  const fromTxs = ownershipFromIssueAuthorityTxs(txs, base, programId);
  return base.map((agent) => {
    const merged = emptyOwnership();
    for (const value of agent.aeonAuthorityAddresses ?? []) merged.authorities.add(value);
    for (const value of agent.aeonBondAddresses ?? []) merged.bonds.add(value);
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

/**
 * Distinguish a failed ownership query from a successful empty result.
 * Query failures must be retryable; empty rows fail closed at decode time.
 */
export function resolveAeonOwnershipQuery(
  data: AeonOwnershipEventRow[] | null | undefined,
  error: unknown,
): { ok: true; rows: AeonOwnershipEventRow[] } | { ok: false } {
  if (error) return { ok: false };
  return { ok: true, rows: data ?? [] };
}

// PostgREST silently truncates every response at the server's db-max-rows
// (Supabase default: 1000) with a 206 Partial Content that supabase-js does
// NOT surface as an error. Ownership history feeds slash attribution, so a
// truncated page must fail closed (retryable), never decode with partial PDAs.
export const AEON_OWNERSHIP_PAGE_SIZE = 1000;
export const AEON_OWNERSHIP_MAX_PAGES = 50;

export interface AeonOwnershipPage {
  data: AeonOwnershipEventRow[] | null;
  error: unknown;
  count: number | null;
}

/** One keyset page: rows with id > afterId, ordered by id ascending. */
export type AeonOwnershipPageFetcher = (afterId: string | null) => Promise<AeonOwnershipPage>;

/**
 * Fetch ALL AEON ownership events through the page fetcher, verifying
 * completeness two ways: the exact PostgREST count must match the accumulated
 * rows, and pagination must terminate on a short page within the page cap.
 * Any page error, count mismatch, or cap exhaustion returns { ok: false } so
 * the caller can retry instead of decoding against silently truncated history.
 */
/**
 * Fetch ALL AEON ownership events through the page fetcher using keyset
 * pagination on the primary key (id ascending, id > cursor). Unlike offset
 * pagination, a concurrent insert can never shift a page boundary: a row
 * inserted behind the cursor is simply excluded (consistent snapshot
 * semantics), a row inserted ahead of it is included exactly once.
 *
 * Completeness is still verified: the first page's exact PostgREST count is
 * the total at fetch start, so finishing with FEWER rows means truncation or
 * deletion and fails closed. Any page error, a missing cursor id on a full
 * page, or page-cap exhaustion also returns { ok: false } so the caller
 * retries instead of decoding against partial ownership history.
 */
export async function fetchAeonOwnershipEvents(
  fetchPage: AeonOwnershipPageFetcher,
  pageSize: number = AEON_OWNERSHIP_PAGE_SIZE,
  maxPages: number = AEON_OWNERSHIP_MAX_PAGES,
): Promise<{ ok: true; rows: AeonOwnershipEventRow[] } | { ok: false }> {
  const rows: AeonOwnershipEventRow[] = [];
  let expected: number | null = null;
  let afterId: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const { data, error, count } = await fetchPage(afterId);
    const resolved = resolveAeonOwnershipQuery(data, error);
    if (!resolved.ok) return resolved;
    if (afterId === null && typeof count === "number") expected = count;
    const batch = resolved.rows;
    rows.push(...batch);
    if (batch.length < pageSize) {
      if (expected !== null && rows.length < expected) return { ok: false };
      return { ok: true, rows };
    }
    const cursor = batch[batch.length - 1]?.id;
    if (typeof cursor !== "string" || cursor.length === 0) return { ok: false };
    afterId = cursor;
  }
  return { ok: false };
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
