// AEON Program instruction decoder for Helius enhanced transactions.
// Server-only.
//
// Discriminators and argument layouts come from the vendored IDL
// (src/lib/indexer/idl/aeon.json ← Adaptive-Liquidity/aeon-program).
// This module does not invent or hard-code discriminator hex.

import type { HeliusEnhancedTx, HeliusInstruction } from "./helius.server";
import { flattenInstructions } from "./helius.server";
import {
  aeonInstructionName,
  decodeAeonArgs,
  decodeInstructionDataBytes,
} from "./aeon-idl";
import { makeEventUid } from "./event-uid";

export interface AeonLookup {
  mint: string;
  aeonCriAddress: string | null;
  executorWallet?: string | null;
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
  },
): void {
  const raw: Record<string, unknown> = {
    programId: input.programId,
    instruction: input.instructionName,
    discriminator: input.discHex,
    ixIndex: input.ixIndex,
    accounts: input.accounts,
    parsedData: input.parsed,
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

  const flat = flattenInstructions(tx.instructions ?? []);
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
    const mints = matchMints(ix, agents);
    if (mints.length === 0) continue;

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
        amountToken: mapping.type === "BOND_DEPOSITED" ? bondAmount : amountToken,
        ixIndex,
        discHex,
        instructionName,
        programId,
        accounts: ix.accounts ?? [],
        parsed,
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
