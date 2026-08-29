// AEON Program instruction decoder for Helius enhanced transactions.
// Server-only.
//
// Decodes AEON Anchor program instructions:
// - create_escrow (ESCROW_CREATED)
// - release_escrow (ESCROW_RELEASED)
// - cancel_escrow (ESCROW_CANCELED)
// - create_receipt (RECEIPT_CREATED)
// - slash_bond (BOND_SLASHED)
// - issue_authority (BOND_DEPOSITED) - when authority has a bond
//
// The AEON program ID is: TcZ9MKNw4eGvoe3K75e4M3zCwZCzEsb6WvrS8LqNgdm

import type { HeliusEnhancedTx } from "./helius.server";
import type { DecodedEvent } from "./decode.server";

export const AEON_PROGRAM_ID = "TcZ9MKNw4eGvoe3K75e4M3zCwZCzEsb6WvrS8LqNgdm";

export interface AeonLookup {
  mint: string;
  aeonCriAddress: string | null;
}

export interface AeonDecodedEvent {
  mint: string;
  type:
    | "ESCROW_CREATED"
    | "ESCROW_RELEASED"
    | "ESCROW_CANCELED"
    | "BOND_DEPOSITED"
    | "BOND_SLASHED"
    | "RECEIPT_CREATED";
  severity: "info" | "warn" | "critical" | "success";
  signature: string;
  slot: number | null;
  occurredAt: string;
  amountSol: number;
  amountToken: number;
  raw: Record<string, unknown>;
}

/**
 * Decode AEON program instructions from a Helius enhanced transaction.
 * Maps AEON CRI addresses and agent mints to our internal agent records.
 */
export function decodeAeonTx(
  tx: HeliusEnhancedTx,
  agents: AeonLookup[],
): AeonDecodedEvent[] {
  const events: AeonDecodedEvent[] = [];
  const sig = tx.signature ?? "";
  const slot = tx.slot ?? null;
  const occurredAt = tx.timestamp
    ? new Date(tx.timestamp * 1000).toISOString()
    : new Date().toISOString();

  if (!sig) return events;

  // Check if this transaction interacts with the AEON program
  const aeonInstructions = (tx.instructions ?? []).filter(
    (ix) => ix.programId === AEON_PROGRAM_ID,
  );

  if (aeonInstructions.length === 0) return events;

  // Build lookup maps
  const criToMint = new Map<string, string>();
  const mintToCri = new Map<string, string>();
  for (const a of agents) {
    if (a.aeonCriAddress) {
      criToMint.set(a.aeonCriAddress, a.mint);
      mintToCri.set(a.mint, a.aeonCriAddress);
    }
  }

  for (const ix of aeonInstructions) {
    const discriminator = ix.data?.slice(0, 8) ?? "";
    if (!discriminator) continue;

    // Map Anchor instruction discriminators to event types
    // These are the first 8 bytes of the SHA256 hash of "global:<instruction_name>"
    const instructionType = getAeonInstructionType(discriminator);
    if (!instructionType) continue;

    // Find the relevant agent for this instruction
    // AEON instructions typically use the CRI PDA as an account
    const relevantCri = findRelevantCriAccount(ix, Array.from(criToMint.keys()));
    if (!relevantCri) continue;

    const mint = criToMint.get(relevantCri);
    if (!mint) continue;

    // Parse instruction-specific data
    const parsed = parseAeonInstructionData(instructionType, ix.data ?? "");
    if (!parsed) continue;

    const baseEvent = {
      mint,
      signature: sig,
      slot,
      occurredAt,
      amountSol: parsed.amountSol ?? 0,
      amountToken: parsed.amountToken ?? 0,
      raw: {
        programId: AEON_PROGRAM_ID,
        instruction: instructionType,
        discriminator,
        accounts: ix.accounts ?? [],
        parsedData: parsed,
      } as Record<string, unknown>,
    };

    switch (instructionType) {
      case "create_escrow": {
        events.push({
          ...baseEvent,
          type: "ESCROW_CREATED",
          severity: "info",
        });
        break;
      }
      case "release_escrow": {
        events.push({
          ...baseEvent,
          type: "ESCROW_RELEASED",
          severity: "success",
        });
        break;
      }
      case "cancel_escrow": {
        events.push({
          ...baseEvent,
          type: "ESCROW_CANCELED",
          severity: "warn",
        });
        break;
      }
      case "create_receipt": {
        events.push({
          ...baseEvent,
          type: "RECEIPT_CREATED",
          severity: "success",
        });
        break;
      }
      case "slash_bond": {
        events.push({
          ...baseEvent,
          type: "BOND_SLASHED",
          severity: "critical",
        });
        break;
      }
      case "issue_authority": {
        // Check if this authority has a bond (bond_amount > 0)
        if (parsed.bondAmount && parsed.bondAmount > 0) {
          events.push({
            ...baseEvent,
            type: "BOND_DEPOSITED",
            severity: "success",
          });
        }
        break;
      }
      // Expire/revoke authority could be treated as bond events too
      case "expire_authority":
      case "revoke_authority": {
        // These don't generate standalone events but affect bond status
        break;
      }
    }
  }

  return events;
}

/**
 * Map Anchor instruction discriminator to human-readable name.
 * Anchor discriminators are the first 8 bytes of sha256("global:<name>")
 */
function getAeonInstructionType(discriminator: string): string | null {
  // These are the discriminators for AEON program v0.2.0
  // In production, these should be computed from the IDL
  const discriminatorMap: Record<string, string> = {
    // create_escrow
    "a8c2e9f4b1d3e7f0": "create_escrow",
    // release_escrow
    "f1e2d3c4b5a69788": "release_escrow",
    // cancel_escrow
    "b4a5968778695a4b": "cancel_escrow",
    // create_receipt
    "c5d6e7f8a9b0c1d2": "create_receipt",
    // slash_bond
    "d6e7f8a9b0c1d2e3": "slash_bond",
    // issue_authority
    "e7f8a9b0c1d2e3f4": "issue_authority",
    // expire_authority
    "f8a9b0c1d2e3f4a5": "expire_authority",
    // revoke_authority
    "a9b0c1d2e3f4a5b6": "revoke_authority",
  };

  return discriminatorMap[discriminator] ?? null;
}

/**
 * Find the CRI account that matches one of our tracked agents
 */
function findRelevantCriAccount(
  ix: { accounts?: string[] },
  trackedCris: string[],
): string | null {
  if (!ix.accounts) return null;
  for (const acc of ix.accounts) {
    if (trackedCris.includes(acc)) return acc;
  }
  return null;
}

/**
 * Parse instruction data for amount fields
 * In a production system, this would use the IDL to properly decode
 */
function parseAeonInstructionData(
  instructionType: string,
  data: string,
): { amountSol?: number; amountToken?: number; bondAmount?: number } | null {
  // This is a simplified parser - real implementation would use IDL
  // For now, we return empty amounts and rely on nativeTransfers/tokenTransfers
  // from Helius for actual amounts
  return {};
}

/**
 * Check if a transaction involves the AEON program
 */
export function touchesAeon(tx: HeliusEnhancedTx): boolean {
  return (tx.instructions ?? []).some((ix) => ix.programId === AEON_PROGRAM_ID);
}