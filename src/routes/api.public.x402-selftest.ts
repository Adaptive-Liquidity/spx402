// SPX402 self-test endpoint — a real x402 paywall we own.
//
// Purpose: validate the prober's signing path end-to-end against a service
// whose behaviour we control, for ~$0.001, before any third-party service is
// ever charged. The prober buys from SPX402; SPX402's own settlement then has
// to show up in agent_events like anybody else's.
//
// GET  → 402 with a v1 body + v2 PAYMENT-REQUIRED header
// GET with X-PAYMENT → verify + settle via the facilitator, then deliver
//
// Disabled (503) unless a treasury address is configured, so we never
// advertise a paywall that can't be paid.

import { createFileRoute } from "@tanstack/react-router";

const SELFTEST_PRICE_ATOMIC = "1000"; // 0.001 USDC (6 decimals)
const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

interface Treasury {
  chain: "solana" | "base";
  network: string;
  payTo: string;
  asset: string;
  facilitator: string;
}

function treasury(): Treasury | null {
  const sol = process.env["SPX_TREASURY_SOLANA"];
  if (sol) {
    return {
      chain: "solana",
      network: "solana",
      payTo: sol,
      asset: SOLANA_USDC,
      facilitator:
        process.env["SPX_FACILITATOR_SOLANA"] ?? "https://facilitator.payai.network",
    };
  }
  const base = process.env["SPX_TREASURY_BASE"];
  if (base) {
    return {
      chain: "base",
      network: "base",
      payTo: base,
      asset: BASE_USDC,
      facilitator: process.env["SPX_FACILITATOR_BASE"] ?? "https://x402.org/facilitator",
    };
  }
  return null;
}

function requirements(t: Treasury, resource: string) {
  return {
    scheme: "exact",
    network: t.network,
    maxAmountRequired: SELFTEST_PRICE_ATOMIC,
    asset: t.asset,
    payTo: t.payTo,
    resource,
    description: "SPX402 prober self-test payload",
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
    extra: { decimals: 6, facilitator: t.facilitator, name: "USDC", version: "2" },
  };
}

export const Route = createFileRoute("/api/public/x402-selftest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const t = treasury();
        if (!t) {
          return json(503, {
            ok: false,
            error: "self-test paywall disabled — no SPX treasury address configured",
          });
        }

        const url = new URL(request.url);
        const resource = `${url.origin}${url.pathname}`;
        const accepts = [requirements(t, resource)];
        const paymentHeader = request.headers.get("x-payment");

        if (!paymentHeader) {
          const body = {
            x402Version: 1,
            error: "X-PAYMENT header is required",
            accepts,
          };
          return new Response(JSON.stringify(body, null, 2), {
            status: 402,
            headers: {
              "content-type": "application/json",
              "payment-required": btoa(JSON.stringify({ x402Version: 2, accepts })),
              "cache-control": "no-store",
            },
          });
        }

        try {
          const { verify, settle } = await import("x402/verify");
          const { exact } = await import("x402/schemes");
          void exact;

          const facilitator = { url: t.facilitator as `${string}://${string}` };
          const decoded = JSON.parse(atob(paymentHeader)) as Record<string, unknown>;

          const verification = await verify(
            decoded as never,
            accepts[0] as never,
            facilitator,
          );
          if (!(verification as { isValid?: boolean }).isValid) {
            return json(402, {
              ok: false,
              error: "payment verification failed",
              detail: (verification as { invalidReason?: string }).invalidReason ?? null,
            });
          }

          const settlement = await settle(
            decoded as never,
            accepts[0] as never,
            facilitator,
          );
          const txn = (settlement as { transaction?: string }).transaction ?? null;

          return new Response(
            JSON.stringify(
              {
                ok: true,
                payload: "spx402-selftest",
                served_at: new Date().toISOString(),
                chain: t.chain,
              },
              null,
              2,
            ),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
                "x-payment-response": btoa(
                  JSON.stringify({ success: true, transaction: txn, network: t.network }),
                ),
                "cache-control": "no-store",
              },
            },
          );
        } catch (err) {
          return json(500, {
            ok: false,
            error: "settlement failed",
            detail: err instanceof Error ? err.message.slice(0, 200) : "unknown",
          });
        }
      },
    },
  },
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
