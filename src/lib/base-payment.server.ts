// Shared on-chain verification for a USDC payment to SPX402 on Base.
// Used by plan purchases and badge subscriptions — the browser sends nothing
// but a transaction hash; everything else is proven against the chain.

import { createPublicClient, decodeEventLog, http, parseAbiItem } from "viem";
import { BASE_USDC } from "@/lib/plans";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const MIN_CONFIRMATIONS = 2;
const MAX_PAYMENT_AGE_SECONDS = 60 * 60 * 24;

export interface UsdcPaymentCheck {
  ok: boolean;
  error?: string;
  paid?: bigint;
  payer?: string | null;
}

export async function verifyUsdcPayment(
  txHash: `0x${string}`,
  minAmountBaseUnits: number,
): Promise<UsdcPaymentCheck> {
  const payTo = process.env["X402_PAY_TO_ADDRESS"]?.toLowerCase();
  const rpcUrl = process.env["BASE_RPC_URL"] ?? "https://mainnet.base.org";
  if (!payTo) return { ok: false, error: "Payments are not configured on this deployment" };

  const client = createPublicClient({ transport: http(rpcUrl) });

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch {
    return { ok: false, error: "Transaction not found on Base yet — retry in a few seconds" };
  }
  if (receipt.status !== "success") return { ok: false, error: "Transaction reverted" };

  let paid = 0n;
  let payer: string | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== BASE_USDC) continue;
    try {
      const parsed = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
      const args = parsed.args as unknown as { from: string; to: string; value: bigint };
      if (args.to.toLowerCase() !== payTo) continue;
      paid += args.value;
      payer ??= args.from.toLowerCase();
    } catch {
      continue;
    }
  }
  if (paid === 0n) return { ok: false, error: "No USDC payment to the SPX402 address" };
  if (paid < BigInt(minAmountBaseUnits)) {
    return { ok: false, error: `Underpaid — expected at least ${minAmountBaseUnits / 1e6} USDC` };
  }

  try {
    const [block, head] = await Promise.all([
      client.getBlock({ blockNumber: receipt.blockNumber }),
      client.getBlockNumber(),
    ]);
    if (Number(head - receipt.blockNumber) + 1 < MIN_CONFIRMATIONS) {
      return { ok: false, error: "Payment is not confirmed yet — retry in a few seconds" };
    }
    if (Math.floor(Date.now() / 1000) - Number(block.timestamp) > MAX_PAYMENT_AGE_SECONDS) {
      return { ok: false, error: "Payment is too old to redeem" };
    }
  } catch {
    return { ok: false, error: "Could not read the settlement block" };
  }

  return { ok: true, paid, payer };
}
