// EAS attestations on Base — SPX402's on-chain stamp.
//
// Whenever an operator verifies or a subscribed agent's grade changes, the
// attester wallet stamps an attestation via Ethereum Attestation Service on
// Base. Anyone can then verify the badge without trusting our servers.
//
// The attester key pays its own microscopic Base ETH gas (our infrastructure
// cost, not user sponsorship). checkAttesterBalance() is the watchdog the
// pipeline sweep calls so badge minting never silently stalls on an empty key.

import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  formatEther,
  http,
  keccak256,
  parseAbi,
  parseEventLogs,
  zeroAddress,
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

/** EAS + SchemaRegistry predeploys on Base mainnet. */
export const EAS_CONTRACT = "0x4200000000000000000000000000000000000021" as const;
export const SCHEMA_REGISTRY = "0x4200000000000000000000000000000000000020" as const;

/** One versioned schema covers every stamp kind. */
export const SCHEMA_KEY = "spx402-v1";
export const SCHEMA_STRING = "string subject,string kind,string grade,uint16 score";

/** Below this, the watchdog fires: ~thousands of stamps of headroom. */
export const ATTESTER_LOW_BALANCE_WEI = 200_000_000_000_000n; // 0.0002 ETH

const REGISTRY_ABI = parseAbi([
  "function register(string schema, address resolver, bool revocable) returns (bytes32)",
]);

const EAS_ABI = parseAbi([
  "struct AttestationRequestData { address recipient; uint64 expirationTime; bool revocable; bytes32 refUID; bytes data; uint256 value; }",
  "struct AttestationRequest { bytes32 schema; AttestationRequestData data; }",
  "function attest(AttestationRequest request) payable returns (bytes32)",
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
]);

const ZERO_UID = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

function rpcUrl(): string {
  return process.env["BASE_RPC_URL"] ?? "https://mainnet.base.org";
}

function attesterAccount() {
  const key = process.env["EAS_ATTESTER_PRIVATE_KEY"];
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return privateKeyToAccount(key as `0x${string}`);
}

/** Public attester address (safe to show), or null when not configured. */
export function attesterAddress(): string | null {
  return attesterAccount()?.address ?? null;
}

/** Schema UID is deterministic: keccak256(abi.encode(schema, resolver, revocable)). */
export function computeSchemaUid(): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: "string" }, { type: "address" }, { type: "bool" }],
      [SCHEMA_STRING, zeroAddress, true],
    ),
  );
}

async function ensureSchema(
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>,
): Promise<`0x${string}`> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const uid = computeSchemaUid();

  const { data: row } = await supabaseAdmin
    .from("eas_schema" as never)
    .select("schema_uid")
    .eq("schema_key", SCHEMA_KEY)
    .maybeSingle();
  if ((row as { schema_uid: string } | null)?.schema_uid) {
    return (row as { schema_uid: string }).schema_uid as `0x${string}`;
  }

  // First-ever stamp: register the schema on-chain, then remember it.
  let txHash: `0x${string}` | null = null;
  try {
    txHash = await walletClient.writeContract({
      address: SCHEMA_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [SCHEMA_STRING, zeroAddress, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  } catch (e) {
    // "AlreadyExists" is fine — another deploy beat us to it.
    if (!/AlreadyExists/i.test(String(e))) throw e;
  }

  await supabaseAdmin.from("eas_schema" as never).upsert({
    schema_key: SCHEMA_KEY,
    schema_uid: uid,
    tx_hash: txHash,
  } as never);
  return uid;
}

export interface AttestResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  uid?: string;
  txHash?: string;
  attester?: string;
}

export type AttestationKind = "grade" | "operator_verified" | "badge_activated";

/** Stamp an attestation for a subject and record it in the attestations table. */
export async function attestSubject(
  mint: string,
  kind: AttestationKind,
  grade: string,
  score: number,
): Promise<AttestResult> {
  const account = attesterAccount();
  if (!account) {
    return { ok: false, skipped: true, reason: "EAS_ATTESTER_PRIVATE_KEY not configured" };
  }

  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl()) });
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(rpcUrl()),
  });

  const schemaUid = await ensureSchema(publicClient, walletClient);
  const data = encodeAbiParameters(
    [{ type: "string" }, { type: "string" }, { type: "string" }, { type: "uint16" }],
    [mint, kind, grade, Math.max(0, Math.min(65535, Math.round(score)))],
  );

  const txHash = await walletClient.writeContract({
    address: EAS_CONTRACT,
    abi: EAS_ABI,
    functionName: "attest",
    args: [
      {
        schema: schemaUid,
        data: {
          recipient: zeroAddress,
          expirationTime: 0n,
          revocable: true,
          refUID: ZERO_UID,
          data,
          value: 0n,
        },
      },
    ],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  const logs = parseEventLogs({ abi: EAS_ABI, logs: receipt.logs, eventName: "Attested" });
  const uid = logs[0]?.args?.uid as `0x${string}` | undefined;
  if (!uid) return { ok: false, reason: "Attested event not found in receipt", txHash };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("attestations" as never).insert({
    mint,
    kind,
    schema_uid: schemaUid,
    attestation_uid: uid,
    tx_hash: txHash,
    attester: account.address.toLowerCase(),
    grade,
    score: Math.round(score),
  } as never);

  return { ok: true, uid, txHash, attester: account.address.toLowerCase() };
}

export interface AttesterBalance {
  configured: boolean;
  address: string | null;
  balanceWei: string;
  balanceEth: string;
  low: boolean;
}

/** Watchdog: is the attester key about to run dry? */
export async function checkAttesterBalance(): Promise<AttesterBalance> {
  const account = attesterAccount();
  if (!account) {
    return { configured: false, address: null, balanceWei: "0", balanceEth: "0", low: false };
  }
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl()) });
  const balance = await publicClient.getBalance({ address: account.address });
  return {
    configured: true,
    address: account.address.toLowerCase(),
    balanceWei: balance.toString(),
    balanceEth: formatEther(balance),
    low: balance < ATTESTER_LOW_BALANCE_WEI,
  };
}
