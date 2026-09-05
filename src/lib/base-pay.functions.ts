// Base Pay — pay for a plan with USDC on Base, verified on-chain.
//
// The browser sends nothing but a transaction hash. Everything that matters
// (recipient, asset, amount, confirmations, freshness, replay) is checked here
// against Base. Self-declared payments are never trusted.

import { createServerFn } from "@tanstack/react-start";
import { createPublicClient, decodeEventLog, http, parseAbiItem } from "viem";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BASE_USDC, isPlanId, PLANS, planDailyLimit, type PlanId } from "@/lib/plans";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

/** Base blocks are ~2s; a small depth protects against a reorg. */
const MIN_CONFIRMATIONS = 2;
/** A settlement older than a day cannot be redeemed for a new plan period. */
const MAX_PAYMENT_AGE_SECONDS = 60 * 60 * 24;

export interface BasePayConfig {
  /** Address that receives USDC, or null when payments are not configured. */
  payTo: string | null;
  /** Coinbase Onramp project id, or null when card funding is not configured. */
  onrampAppId: string | null;
  usdc: string;
  chainId: number;
}

export const getBasePayConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<BasePayConfig> => ({
    payTo: process.env["X402_PAY_TO_ADDRESS"]?.toLowerCase() ?? null,
    onrampAppId: process.env["COINBASE_ONRAMP_APP_ID"] ?? null,
    usdc: BASE_USDC,
    chainId: 8453,
  }),
);

interface RedeemInput {
  txHash: string;
  plan: PlanId;
  apiKeyId: string | null;
}

export interface RedeemResult {
  ok: boolean;
  error?: string;
  plan?: PlanId;
  grantedUntil?: string;
  dailyLimit?: number;
}

export const redeemPlanPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { txHash?: string; plan?: string; apiKeyId?: string | null }) => {
    const txHash = (input?.txHash ?? "").trim().toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(txHash)) throw new Error("Invalid Base transaction hash");
    if (!isPlanId(input?.plan)) throw new Error("Unknown plan");
    const apiKeyId = input?.apiKeyId ?? null;
    if (apiKeyId !== null && !/^[0-9a-f-]{36}$/i.test(apiKeyId)) throw new Error("Invalid key id");
    return { txHash, plan: input.plan, apiKeyId } satisfies RedeemInput;
  })
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    const payTo = process.env["X402_PAY_TO_ADDRESS"]?.toLowerCase();
    const rpcUrl = process.env["BASE_RPC_URL"] ?? "https://mainnet.base.org";
    if (!payTo) return { ok: false, error: "Payments are not configured on this deployment" };

    const spec = PLANS[data.plan];
    const client = createPublicClient({ transport: http(rpcUrl) });

    let receipt;
    try {
      receipt = await client.getTransactionReceipt({ hash: data.txHash as `0x${string}` });
    } catch {
      return { ok: false, error: "Transaction not found on Base yet — retry in a few seconds" };
    }
    if (receipt.status !== "success") return { ok: false, error: "Transaction reverted" };

    let paid = 0n;
    let payer: string | null = null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== BASE_USDC) continue;
      try {
        const parsed = decodeEventLog({
          abi: [TRANSFER_EVENT],
          data: log.data,
          topics: log.topics,
        });
        const args = parsed.args as unknown as { from: string; to: string; value: bigint };
        if (args.to.toLowerCase() !== payTo) continue;
        paid += args.value;
        payer ??= args.from.toLowerCase();
      } catch {
        continue;
      }
    }
    if (paid === 0n) return { ok: false, error: "No USDC payment to the SPX402 address" };
    if (paid < BigInt(spec.priceUsdc)) {
      return { ok: false, error: `Underpaid — ${spec.name} costs ${spec.priceUsdc / 1e6} USDC` };
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // The key being upgraded must belong to the caller.
    let apiKeyId = data.apiKeyId;
    if (apiKeyId) {
      const { data: key } = await supabaseAdmin
        .from("api_keys")
        .select("id")
        .eq("id", apiKeyId)
        .eq("user_id", context.userId)
        .eq("status", "active")
        .maybeSingle();
      if (!key) return { ok: false, error: "That API key is not yours or is revoked" };
    } else {
      apiKeyId = null;
    }

    const grantedUntil = new Date(Date.now() + spec.days * 86_400_000).toISOString();

    // Unique tx_hash is the replay guard: one settlement buys one period.
    const { error: claimError } = await supabaseAdmin.from("plan_purchases").insert({
      user_id: context.userId,
      api_key_id: apiKeyId,
      tx_hash: data.txHash,
      chain: "base",
      payer,
      amount_usdc: Number(paid),
      plan: spec.id,
      granted_until: grantedUntil,
    });
    if (claimError) return { ok: false, error: "This payment has already been redeemed" };

    if (apiKeyId) {
      await supabaseAdmin
        .from("api_keys")
        .update({
          tier: spec.tier,
          daily_limit: planDailyLimit(spec),
          expires_at: grantedUntil,
        })
        .eq("id", apiKeyId)
        .eq("user_id", context.userId);
    }

    return {
      ok: true,
      plan: spec.id,
      grantedUntil,
      dailyLimit: planDailyLimit(spec),
    };
  });

/** Purchases made by the signed-in account, newest first. */
export const listPlanPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plan_purchases")
      .select("id, plan, amount_usdc, tx_hash, granted_until, created_at, api_key_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return data ?? [];
  });
