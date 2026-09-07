import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Card payments are not configured for this build. Complete payment go-live to enable card checkout.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

/** True when a card checkout can be offered at all. */
export function cardPaymentsConfigured(): boolean {
  return Boolean(clientToken?.startsWith("pk_test_") || clientToken?.startsWith("pk_live_"));
}

export function cardPaymentsTestMode(): boolean {
  return Boolean(clientToken?.startsWith("pk_test_"));
}

/** Card price ids, one per plan. Mirrors src/lib/plans.ts. */
export const PLAN_PRICE_IDS = {
  pro: "pro_monthly",
  team: "team_monthly",
} as const;
