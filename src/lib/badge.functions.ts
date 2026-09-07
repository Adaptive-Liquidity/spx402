// Operator badge subscriptions — paid, recurring, honestly graded.
//
// subscribeBadge takes nothing but a transaction hash from the browser and
// proves the USDC settlement on-chain before activating monitoring. The
// initial EAS attestation fires on activation; grade-change attestations are
// stamped by the scoring cron for every subscribed subject.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BADGE_TIERS, isBadgeTier, type BadgeTier } from "@/lib/badge-plans";
import { BASE_USDC } from "@/lib/plans";

export interface BadgePlansConfig {
  payTo: string | null;
  attester: string | null;
  usdc: string;
  chainId: number;
}

export const getBadgePlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<BadgePlansConfig> => {
    const { attesterAddress } = await import("@/lib/eas.server");
    return {
      payTo: process.env["X402_PAY_TO_ADDRESS"]?.toLowerCase() ?? null,
      attester: attesterAddress(),
      usdc: BASE_USDC,
      chainId: 8453,
    };
  },
);

/**
 * Pre-payment guard. The browser pays USDC before the server ever sees the
 * request, so an unknown subject would burn a real, unrefundable settlement.
 * This public read lets checkout refuse to charge for a subject we do not
 * monitor. It exposes nothing beyond "is this identifier on the terminal".
 */
export const checkBadgeSubject = createServerFn({ method: "GET" })
  .inputValidator((input: { mint?: string }) => {
    const mint = (input?.mint ?? "").trim();
    if (mint.length < 8 || mint.length > 64 || !/^[a-zA-Z0-9]+$/.test(mint)) {
      throw new Error("Invalid agent identifier");
    }
    return { mint };
  })
  .handler(async ({ data }): Promise<{ exists: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("mint")
      .eq("mint", data.mint)
      .maybeSingle();
    return { exists: Boolean(agent) };
  });

export interface SubscribeResult {
  ok: boolean;
  error?: string;
  tier?: BadgeTier;
  grantedUntil?: string;
  attestation?: { uid?: string; txHash?: string; skipped?: boolean; reason?: string };
}

export const subscribeBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { txHash?: string; mint?: string; tier?: string }) => {
    const txHash = (input?.txHash ?? "").trim().toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(txHash)) throw new Error("Invalid Base transaction hash");
    const mint = (input?.mint ?? "").trim();
    if (mint.length < 8 || mint.length > 64 || !/^[a-zA-Z0-9]+$/.test(mint)) {
      throw new Error("Invalid agent identifier");
    }
    if (!isBadgeTier(input?.tier)) throw new Error("Unknown badge tier");
    return { txHash, mint, tier: input.tier };
  })
  .handler(async ({ data, context }): Promise<SubscribeResult> => {
    const spec = BADGE_TIERS[data.tier];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // The subject must exist on the terminal — we monitor real agents only.
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("mint, grade, score")
      .eq("mint", data.mint)
      .maybeSingle();
    if (!agent) return { ok: false, error: "That agent is not on the SPX402 terminal" };

    const { verifyUsdcPayment } = await import("@/lib/base-payment.server");
    const check = await verifyUsdcPayment(data.txHash as `0x${string}`, spec.priceUsdc);
    if (!check.ok) return { ok: false, error: check.error };

    const grantedUntil = new Date(Date.now() + spec.days * 86_400_000).toISOString();

    // Unique tx_hash is the replay guard: one settlement buys one period.
    const { error: claimError } = await supabaseAdmin.from("badge_subscriptions" as never).insert({
      user_id: context.userId,
      mint: data.mint,
      tier: spec.id,
      status: "active",
      tx_hash: data.txHash,
      payer: check.payer ?? null,
      amount_usdc: Number(check.paid ?? 0n),
      granted_until: grantedUntil,
    } as never);
    if (claimError) return { ok: false, error: "This payment has already been redeemed" };

    // Stamp the activation attestation. A chain hiccup must never eat a paid
    // subscription — report it, and the next scoring sweep re-stamps.
    let attestation: SubscribeResult["attestation"];
    try {
      const { attestSubject } = await import("@/lib/eas.server");
      const result = await attestSubject(
        data.mint,
        "badge_activated",
        // Withheld agents must never be stamped with a fabricated grade.
        // "WITHHELD" is honest metadata on a subscription activation stamp.
        (await supabaseAdmin
          .from("agents" as never)
          .select("withheld_reason")
          .eq("mint", data.mint)
          .maybeSingle()
          .then(
            (r) =>
              (r.data as unknown as { withheld_reason: string | null } | null)?.withheld_reason ??
              null,
          )) != null
          ? "WITHHELD"
          : (agent.grade ?? "SPX404"),
        Number(agent.score ?? 0),
      );
      attestation = {
        uid: result.uid,
        txHash: result.txHash,
        skipped: result.skipped,
        reason: result.reason,
      };
    } catch (e) {
      console.error("[badge] activation attestation failed:", String(e).slice(0, 300));
      attestation = { skipped: true, reason: "Attestation will retry on the next sweep" };
    }

    return { ok: true, tier: spec.id, grantedUntil, attestation };
  });

/** Badge subscriptions owned by the signed-in account, newest first. */
export const listBadgeSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("badge_subscriptions" as never)
      .select("id, mint, tier, status, tx_hash, amount_usdc, granted_until, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return [];
    return (data ?? []) as unknown as Array<{
      id: string;
      mint: string;
      tier: BadgeTier;
      status: string;
      tx_hash: string;
      amount_usdc: number;
      granted_until: string;
      created_at: string;
    }>;
  });

/** Public: attestations published for a subject, newest first. */
export const listAttestations = createServerFn({ method: "GET" })
  .inputValidator((input: { mint?: string }) => {
    const mint = (input?.mint ?? "").trim();
    if (!/^[a-zA-Z0-9]{8,64}$/.test(mint)) throw new Error("Invalid agent identifier");
    return { mint };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("attestations" as never)
      .select("attestation_uid, kind, grade, score, tx_hash, attester, created_at")
      .eq("mint", data.mint)
      .order("created_at", { ascending: false })
      .limit(20);
    return (rows ?? []) as unknown as Array<{
      attestation_uid: string;
      kind: string;
      grade: string | null;
      score: number | null;
      tx_hash: string | null;
      attester: string;
      created_at: string;
    }>;
  });
