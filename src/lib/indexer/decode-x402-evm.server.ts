// x402 settlement decoder — EVM / Base lane. Server-only.
// PARSER_VERSION: v1.0.0-evm
//
// Detection model (EVM). There is NO memo tier on EVM: x402 settlement is a
// structural on-chain action, not a self-label.
//
//   A. facilitator_sender — tx sender ∈ facilitator registry (chain `base`)
//      AND the calldata is an EIP-3009 `transferWithAuthorization` against
//      Base USDC, or a Permit2 `permitWitnessTransferFrom` moving Base USDC.
//      Confidence: high. THIS IS THE ONLY TIER THAT IS EVER SCORED.
//
//   B. eip3009_pattern — a valid EIP-3009 settlement whose sender is NOT in
//      the registry. Confidence: low. EIP-3009 is not x402-exclusive, so this
//      tier exists purely to surface CANDIDATE FACILITATORS for
//      scripts/discover-facilitators.ts. It must never reach `agent_events`
//      and must never influence a grade. `tierAOnly()` below is the hard
//      boundary the cron persists through.
//
// Selector + topic constants are DERIVED from canonical signatures at build
// time (viem keccak) and PINNED by captured fixtures E1/E2 — never typed from
// memory. Until those fixtures are captured the corresponding tests are
// SKIPPED with a stated reason, per fixture governance.

import { decodeFunctionData, parseAbi, toEventSelector, toFunctionSelector } from "viem";
import { BASE_USDC } from "./evm.server";
import type { Facilitator } from "./facilitators.server";
import { facilitatorForSender } from "./facilitators.server";

export const EVM_X402_PARSER_VERSION = "v1.0.0-evm";

// Canonical Permit2 deployment (same address on every chain).
export const PERMIT2_ADDRESS = "0x000000000022d473030f116ddee9f6b43ac78ba3";

export const EIP3009_ABI = parseAbi([
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
]);
export const EIP3009_SIG_ABI = parseAbi([
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)",
]);
export const PERMIT2_ABI = parseAbi([
  "function permitWitnessTransferFrom(((address token, uint256 amount) permitted, uint256 nonce, uint256 deadline) permit, (address to, uint256 requestedAmount) transferDetails, address owner, bytes32 witness, string witnessTypeString, bytes signature)",
]);

export const TRANSFER_WITH_AUTHORIZATION_SELECTOR = toFunctionSelector(
  EIP3009_ABI[0]!,
).toLowerCase();
export const TRANSFER_WITH_AUTHORIZATION_SIG_SELECTOR = toFunctionSelector(
  EIP3009_SIG_ABI[0]!,
).toLowerCase();
export const PERMIT_WITNESS_TRANSFER_FROM_SELECTOR = toFunctionSelector(
  PERMIT2_ABI[0]!,
).toLowerCase();

/** `AuthorizationUsed(address authorizer, bytes32 nonce)` — the indexable log. */
export const AUTHORIZATION_USED_TOPIC = toEventSelector(
  "AuthorizationUsed(address,bytes32)",
).toLowerCase();

export type EvmDetectionMethod = "facilitator_sender" | "eip3009_pattern";

export interface EvmX402Event {
  chain: "base";
  executorWallet: string; // payee (0x, lowercase-normalized)
  payerWallet: string | null; // authorizer / transferWithAuthorization.from
  txHash: string;
  blockNumber: number;
  occurredAt: string; // block timestamp, filled by the caller
  amountToken: number; // USDC raw units (6dp)
  detectionMethod: EvmDetectionMethod;
  confidence: "high" | "low";
  facilitatorId: string | null;
  raw: Record<string, unknown>;
}

export interface EvmTxInput {
  from: string;
  to: string;
  input: string;
  hash: string;
  blockNumber: number;
}

export interface DecodeEvmOpts {
  /** Optional restriction to a known payee set. Empty = accept all payees. */
  watchlist?: string[];
  /** Block timestamp (ISO). Callers resolve this once per block. */
  occurredAt?: string;
}

const lower = (v: string | null | undefined): string => (v ?? "").toLowerCase();

interface Settlement {
  payer: string | null;
  payee: string;
  amount: bigint;
  token: string;
  call: "transferWithAuthorization" | "permitWitnessTransferFrom";
}

function parseSettlement(input: string, to: string): Settlement | null {
  const data = lower(input);
  if (data.length < 10) return null;
  const selector = data.slice(0, 10);

  // ── EIP-3009 on the USDC contract itself.
  if (
    selector === TRANSFER_WITH_AUTHORIZATION_SELECTOR ||
    selector === TRANSFER_WITH_AUTHORIZATION_SIG_SELECTOR
  ) {
    if (lower(to) !== BASE_USDC) return null;
    try {
      const abi = selector === TRANSFER_WITH_AUTHORIZATION_SELECTOR ? EIP3009_ABI : EIP3009_SIG_ABI;
      const { args } = decodeFunctionData({ abi, data: data as `0x${string}` });
      const [from, payee, value] = args as unknown as [string, string, bigint];
      return {
        payer: lower(from),
        payee: lower(payee),
        amount: value,
        token: BASE_USDC,
        call: "transferWithAuthorization",
      };
    } catch {
      return null;
    }
  }

  // ── Permit2 signature-transfer path.
  if (selector === PERMIT_WITNESS_TRANSFER_FROM_SELECTOR) {
    if (lower(to) !== PERMIT2_ADDRESS) return null;
    try {
      const { args } = decodeFunctionData({
        abi: PERMIT2_ABI,
        data: data as `0x${string}`,
      });
      const [permit, transferDetails, owner] = args as unknown as [
        { permitted: { token: string; amount: bigint } },
        { to: string; requestedAmount: bigint },
        string,
      ];
      if (lower(permit.permitted.token) !== BASE_USDC) return null;
      return {
        payer: lower(owner),
        payee: lower(transferDetails.to),
        amount: transferDetails.requestedAmount,
        token: BASE_USDC,
        call: "permitWitnessTransferFrom",
      };
    } catch {
      return null;
    }
  }

  return null;
}

export function decodeEvmX402Tx(
  tx: EvmTxInput,
  registry: Map<string, Facilitator>,
  opts: DecodeEvmOpts = {},
): EvmX402Event[] {
  const settlement = parseSettlement(tx.input, tx.to);
  if (!settlement) return [];

  const facilitator = facilitatorForSender(registry, tx.from);
  const method: EvmDetectionMethod = facilitator ? "facilitator_sender" : "eip3009_pattern";
  const confidence: "high" | "low" = facilitator ? "high" : "low";

  // Never treat the facilitator's own inbound flows as agent revenue.
  if (facilitator && settlement.payee === lower(facilitator.address)) return [];

  if (opts.watchlist && opts.watchlist.length > 0) {
    const allowed = new Set(opts.watchlist.map(lower));
    if (!allowed.has(settlement.payee)) return [];
  }

  return [
    {
      chain: "base",
      executorWallet: settlement.payee,
      payerWallet: settlement.payer,
      txHash: tx.hash,
      blockNumber: tx.blockNumber,
      occurredAt: opts.occurredAt ?? new Date().toISOString(),
      amountToken: Number(settlement.amount),
      detectionMethod: method,
      confidence,
      facilitatorId: facilitator?.id ?? null,
      raw: {
        chain: "base",
        sender: lower(tx.from),
        contract: lower(tx.to),
        call: settlement.call,
        token: settlement.token,
        payerWallet: settlement.payer,
        detectionMethod: method,
        confidence,
        facilitatorId: facilitator?.id ?? null,
        parserVersion: EVM_X402_PARSER_VERSION,
      },
    },
  ];
}

/**
 * HARD BOUNDARY. The only events allowed anywhere near `agent_events` or a
 * score. Tier B is discovery-only and is filtered out here, once, so no
 * persistence path can bypass it.
 */
export function tierAOnly(events: EvmX402Event[]): EvmX402Event[] {
  return events.filter(
    (e) => e.detectionMethod === "facilitator_sender" && e.confidence === "high",
  );
}
