// AEON Program instruction decoder for Helius enhanced transactions.
// Server-only.
//
// Discriminators and argument layouts come from the vendored IDL
// (src/lib/indexer/idl/aeon.json ← Adaptive-Liquidity/aeon-program).
// This module does not invent or hard-code discriminator hex.

import type { HeliusEnhancedTx, HeliusInstruction } from "./helius.server";
import {
  flattenInstructions,
  SPL_TOKEN_2022_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
} from "./helius.server";
import {
  aeonEventName,
  aeonInstructionName,
  decodeAeonArgs,
  decodeAeonEvent,
  decodeInstructionDataBytes,
  namedInstructionAccounts,
  namedIssueAuthorityAccounts,
} from "./aeon-idl";
import { makeEventUid } from "./event-uid";

export interface AeonLookup {
  mint: string;
  aeonCriAddress: string | null;
  executorWallet?: string | null;
  /** Identity PDA (IDL seeds ["agent", agent]). Never match this against CRI. */
  aeonAgentIdentity?: string | null;
  /** Authority PDA owned by this agent (IDL seeds ["authority", authority_id]). */
  aeonAuthorityAddress?: string | null;
  /** Bond PDA owned by this agent (IDL seeds ["authority_bond", authority_id]). */
  aeonBondAddress?: string | null;
  aeonAuthorityAddresses?: string[];
  aeonBondAddresses?: string[];
}

export type AeonEventType =
  | "ESCROW_CREATED"
  | "ESCROW_RELEASED"
  | "ESCROW_CANCELED"
  | "BOND_DEPOSITED"
  | "BOND_SLASHED"
  | "RECEIPT_CREATED"
  | "AEON_PAYMENT"
  | "AEON_AGENT_REGISTERED"
  | "AEON_AUTHORITY_ISSUED"
  | "AEON_AUTHORITY_REVOKED"
  | "AEON_AUTHORITY_EXPIRED"
  | "AEON_ATOMIC_SPLIT"
  | "AEON_ORG_CREATED"
  | "AEON_ORG_DEPOSIT"
  | "AEON_ORG_SPLIT"
  | "AEON_ORG_DISSOLVED"
  | "AEON_ORG_JOINED"
  | "AEON_ORG_SHARE_SET"
  | "AEON_ORG_RESIDUAL_RECLAIMED"
  | "AEON_PAUSE_SET"
  | "AEON_CONFIG_INITIALIZED";

export interface AeonDecodedEvent {
  mint: string;
  type: AeonEventType;
  severity: "info" | "warn" | "critical" | "success";
  signature: string;
  slot: number | null;
  occurredAt: string;
  amountSol: number;
  amountToken: number;
  eventUid: string;
  raw: Record<string, unknown>;
}

type Severity = AeonDecodedEvent["severity"];

const IX_EVENT: Record<string, { type: AeonEventType; severity: Severity } | null> = {
  initialize_config: { type: "AEON_CONFIG_INITIALIZED", severity: "info" },
  register_agent: { type: "AEON_AGENT_REGISTERED", severity: "success" },
  issue_authority: { type: "AEON_AUTHORITY_ISSUED", severity: "info" },
  revoke_authority: { type: "AEON_AUTHORITY_REVOKED", severity: "warn" },
  expire_authority: { type: "AEON_AUTHORITY_EXPIRED", severity: "warn" },
  pay: { type: "AEON_PAYMENT", severity: "success" },
  create_escrow: { type: "ESCROW_CREATED", severity: "info" },
  release_escrow: { type: "ESCROW_RELEASED", severity: "success" },
  cancel_escrow: { type: "ESCROW_CANCELED", severity: "warn" },
  atomic_split: { type: "AEON_ATOMIC_SPLIT", severity: "info" },
  create_org: { type: "AEON_ORG_CREATED", severity: "info" },
  deposit_to_org: { type: "AEON_ORG_DEPOSIT", severity: "info" },
  org_split: { type: "AEON_ORG_SPLIT", severity: "info" },
  dissolve_org: { type: "AEON_ORG_DISSOLVED", severity: "warn" },
  join_org: { type: "AEON_ORG_JOINED", severity: "info" },
  set_member_share: { type: "AEON_ORG_SHARE_SET", severity: "info" },
  reclaim_org_residual: { type: "AEON_ORG_RESIDUAL_RECLAIMED", severity: "info" },
  create_receipt: { type: "RECEIPT_CREATED", severity: "success" },
  set_paused: { type: "AEON_PAUSE_SET", severity: "warn" },
  slash_bond: { type: "BOND_SLASHED", severity: "critical" },
};

function asFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : 0;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : 0;
  }
  return 0;
}

function tokenAmountFromArgs(args: Record<string, unknown> | null): number {
  if (!args) return 0;
  if (args.amount != null) return asFiniteNumber(args.amount);
  if (args.bond_amount != null) return asFiniteNumber(args.bond_amount);
  if (Array.isArray(args.amounts)) {
    return args.amounts.reduce<number>((sum, item) => sum + asFiniteNumber(item), 0);
  }
  return 0;
}

function matchMints(ix: HeliusInstruction, agents: AeonLookup[]): string[] {
  const accounts = new Set(ix.accounts ?? []);
  const mints: string[] = [];
  const seen = new Set<string>();
  for (const a of agents) {
    const cri = a.aeonCriAddress;
    const wallet = a.executorWallet;
    if ((cri && accounts.has(cri)) || (wallet && accounts.has(wallet))) {
      if (!seen.has(a.mint)) {
        seen.add(a.mint);
        mints.push(a.mint);
      }
    }
  }
  return mints;
}

/**
 * issue_authority attaches by executor signer or identity PDA — never CRI
 * against named.agent. See docs/aeon-identity.md.
 */
function matchIssueAuthorityMints(named: Record<string, string>, agents: AeonLookup[]): string[] {
  const mints: string[] = [];
  const seen = new Set<string>();
  for (const a of agents) {
    const byWallet = Boolean(named.agent && a.executorWallet && named.agent === a.executorWallet);
    const byIdentity = Boolean(
      named.agent_identity && a.aeonAgentIdentity && named.agent_identity === a.aeonAgentIdentity,
    );
    if (!byWallet && !byIdentity) continue;
    if (!seen.has(a.mint)) {
      seen.add(a.mint);
      mints.push(a.mint);
    }
  }
  return mints;
}

/**
 * slash_bond accounts are slasher, config, authority, bond, vault, destination,
 * mint, and token program. The bonded agent's wallet/CRI is not present, so
 * matching any tracked wallet would attribute the slash to the slasher.
 * Resolve only via the authority or bond PDA from the IDL account list.
 */
function pdaList(primary: string | null | undefined, extra?: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of [primary, ...(extra ?? [])]) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function matchSlashBondMints(ix: HeliusInstruction, agents: AeonLookup[]): string[] {
  const named = namedInstructionAccounts("slash_bond", ix.accounts ?? []);
  const authority = named.authority;
  const bond = named.bond;
  if (!authority && !bond) return [];
  const mints: string[] = [];
  const seen = new Set<string>();
  for (const a of agents) {
    const authorities = pdaList(a.aeonAuthorityAddress, a.aeonAuthorityAddresses);
    const bonds = pdaList(a.aeonBondAddress, a.aeonBondAddresses);
    const matchesAuthority = Boolean(authority && authorities.includes(authority));
    const matchesBond = Boolean(bond && bonds.includes(bond));
    if (!matchesAuthority && !matchesBond) continue;
    if (!seen.has(a.mint)) {
      seen.add(a.mint);
      mints.push(a.mint);
    }
  }
  return mints;
}

function txLogLines(tx: HeliusEnhancedTx): string[] {
  return tx.logMessages ?? tx.logs ?? [];
}

interface BondSlashedLogEvent {
  authorityId: number;
  amount: number;
}

const INVOKE_RE = /^Program (\S+) invoke \[(\d+)\]/;
const SUCCESS_RE = /^Program (\S+) success/;
const FAILED_RE = /^Program (\S+) failed/;

/**
 * Parse BondSlashed program events in log order, only while AEON is top of
 * the invoke stack. Foreign programs that emit a fake BondSlashed are ignored.
 */
function parseBondSlashedEvents(tx: HeliusEnhancedTx, programId: string): BondSlashedLogEvent[] {
  const out: BondSlashedLogEvent[] = [];
  const stack: string[] = [];
  for (const line of txLogLines(tx)) {
    const invoke = line.match(INVOKE_RE);
    if (invoke) {
      stack.push(invoke[1]);
      continue;
    }
    if (SUCCESS_RE.test(line) || FAILED_RE.test(line)) {
      const id = line.match(/^Program (\S+)/)?.[1];
      if (stack.length > 0 && (!id || stack[stack.length - 1] === id)) stack.pop();
      else if (stack.length > 0) stack.pop();
      continue;
    }
    const prefix = "Program data: ";
    const idx = line.indexOf(prefix);
    if (idx < 0) continue;
    if (stack[stack.length - 1] !== programId) continue;
    const encoded = line.slice(idx + prefix.length).trim();
    if (!encoded) continue;
    let bytes: Buffer;
    try {
      bytes = Buffer.from(encoded, "base64");
    } catch {
      continue;
    }
    if (bytes.length < 8) continue;
    const name = aeonEventName(bytes.subarray(0, 8).toString("hex"));
    if (name !== "BondSlashed") continue;
    const parsed = decodeAeonEvent("BondSlashed", bytes);
    const amount = asFiniteNumber(parsed?.amount);
    if (amount <= 0) continue;
    out.push({
      authorityId: asFiniteNumber(parsed?.authority_id),
      amount,
    });
  }
  return out;
}

function takeBondSlashedAmount(
  remaining: BondSlashedLogEvent[],
  authorityId: number | null,
): number {
  if (authorityId === null) return 0;
  const idx = remaining.findIndex((event) => event.authorityId === authorityId);
  if (idx < 0) return 0;
  const [hit] = remaining.splice(idx, 1);
  return hit?.amount ?? 0;
}

function innerTransferAmountFromVault(
  ix: HeliusInstruction,
  bondVault: string | undefined,
): number {
  if (!bondVault) return 0;
  for (const inner of ix.innerInstructions ?? []) {
    if (inner.programId !== SPL_TOKEN_PROGRAM_ID && inner.programId !== SPL_TOKEN_2022_PROGRAM_ID) {
      continue;
    }
    const info = inner.parsed?.info ?? {};
    const source = typeof info.source === "string" ? info.source : undefined;
    if (source !== bondVault) continue;
    const amount = asFiniteNumber(info.amount);
    if (amount > 0) return amount;
  }
  return 0;
}

/** Event amount, else per-ix inner SPL from bond_vault, else fail-closed 0. */
function slashAmountFromVerifiedData(ix: HeliusInstruction, fromEvent: number): number {
  if (fromEvent > 0) return fromEvent;
  const named = namedInstructionAccounts("slash_bond", ix.accounts ?? []);
  return innerTransferAmountFromVault(ix, named.bond_vault);
}

function pushEvent(
  events: AeonDecodedEvent[],
  input: {
    mint: string;
    type: AeonEventType;
    severity: Severity;
    signature: string;
    slot: number | null;
    occurredAt: string;
    amountToken: number;
    ixIndex: number;
    discHex: string;
    instructionName: string;
    programId: string;
    accounts: string[];
    parsed: Record<string, unknown> | null;
    extraRaw?: Record<string, unknown>;
  },
): void {
  const raw: Record<string, unknown> = {
    programId: input.programId,
    instruction: input.instructionName,
    discriminator: input.discHex,
    ixIndex: input.ixIndex,
    accounts: input.accounts,
    parsedData: input.parsed,
    ...input.extraRaw,
  };
  events.push({
    mint: input.mint,
    type: input.type,
    severity: input.severity,
    signature: input.signature,
    slot: input.slot,
    occurredAt: input.occurredAt,
    amountSol: 0,
    amountToken: input.amountToken,
    eventUid: makeEventUid({
      signature: input.signature,
      type: input.type,
      mint: input.mint,
      ixIndex: input.ixIndex,
      discHex: input.discHex,
    }),
    raw,
  });
}

/**
 * Decode AEON program instructions from a Helius enhanced transaction.
 * Matches tracked CRI PDAs and executor wallets in instruction accounts.
 */
export function decodeAeonTx(
  tx: HeliusEnhancedTx,
  agents: AeonLookup[],
  programId: string,
): AeonDecodedEvent[] {
  const events: AeonDecodedEvent[] = [];
  const sig = tx.signature ?? "";
  const slot = tx.slot ?? null;
  const occurredAt = tx.timestamp
    ? new Date(tx.timestamp * 1000).toISOString()
    : new Date().toISOString();

  if (!sig || agents.length === 0) return events;
  // Success-path only. Failed txs still flow through decode-failure.server.ts.
  if (tx.transactionError) return events;

  const flat = flattenInstructions(tx.instructions ?? []);
  const remainingBondSlashed = parseBondSlashedEvents(tx, programId);
  for (let ixIndex = 0; ixIndex < flat.length; ixIndex++) {
    const ix = flat[ixIndex];
    if (ix.programId !== programId) continue;
    if (!ix.data) continue;

    const bytes = decodeInstructionDataBytes(ix.data);
    if (!bytes || bytes.length < 8) continue;

    const discHex = bytes.subarray(0, 8).toString("hex");
    const instructionName = aeonInstructionName(discHex);
    if (!instructionName) continue;

    const mapping = IX_EVENT[instructionName];
    if (!mapping) continue;

    const parsed = decodeAeonArgs(instructionName, bytes);
    const issueNamed =
      instructionName === "issue_authority"
        ? namedIssueAuthorityAccounts(ix.accounts ?? [], parsed)
        : null;
    const mints =
      instructionName === "slash_bond"
        ? matchSlashBondMints(ix, agents)
        : instructionName === "issue_authority"
          ? matchIssueAuthorityMints(issueNamed ?? {}, agents)
          : matchMints(ix, agents);
    if (mints.length === 0) continue;

    const slashAuthorityId =
      instructionName === "slash_bond" && parsed && parsed.authority_id != null
        ? asFiniteNumber(parsed.authority_id)
        : null;
    const slashAmount =
      instructionName === "slash_bond"
        ? slashAmountFromVerifiedData(
            ix,
            takeBondSlashedAmount(remainingBondSlashed, slashAuthorityId),
          )
        : 0;
    const amountToken = tokenAmountFromArgs(parsed);
    const bondAmount = asFiniteNumber(parsed?.bond_amount);

    for (const mint of mints) {
      pushEvent(events, {
        mint,
        type: mapping.type,
        severity: mapping.severity,
        signature: sig,
        slot,
        occurredAt,
        amountToken:
          mapping.type === "BOND_DEPOSITED"
            ? bondAmount
            : mapping.type === "BOND_SLASHED"
              ? slashAmount
              : amountToken,
        ixIndex,
        discHex,
        instructionName,
        programId,
        accounts: ix.accounts ?? [],
        parsed,
        extraRaw: {
          ...(mapping.type === "BOND_SLASHED" ? { amountSource: "verified_tx" } : {}),
          ...(issueNamed?.authority ? { authority: issueNamed.authority } : {}),
          ...(issueNamed?.bond ? { bond: issueNamed.bond } : {}),
          ...(issueNamed?.agent_identity ? { agent_identity: issueNamed.agent_identity } : {}),
        },
      });

      if (instructionName === "issue_authority" && bondAmount > 0) {
        pushEvent(events, {
          mint,
          type: "BOND_DEPOSITED",
          severity: "success",
          signature: sig,
          slot,
          occurredAt,
          amountToken: bondAmount,
          ixIndex,
          discHex,
          instructionName,
          programId,
          accounts: ix.accounts ?? [],
          parsed,
          extraRaw: {
            ...(issueNamed?.authority ? { authority: issueNamed.authority } : {}),
            ...(issueNamed?.bond ? { bond: issueNamed.bond } : {}),
            ...(issueNamed?.agent_identity ? { agent_identity: issueNamed.agent_identity } : {}),
          },
        });
      }
    }
  }

  return events;
}

/** True when any flattened instruction targets the configured AEON program. */
export function touchesAeon(tx: HeliusEnhancedTx, programId: string): boolean {
  return flattenInstructions(tx.instructions ?? []).some((ix) => ix.programId === programId);
}
