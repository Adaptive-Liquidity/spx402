// Tier 1 §2 — Sign in with Base.
//
// Server side of wallet authentication. Flow:
//   1. Client asks for a one-time sign-in message (getWalletAuthMessage).
//   2. Wallet signs it (personal_sign / EIP-191; Coinbase Smart Wallet via
//      ERC-1271 — we verify on-chain through Base).
//   3. verifyWalletSignature checks the signature, finds-or-creates the
//      account keyed by wallet, rotates a server-derived password, and
//      returns credentials the client uses with signInWithPassword.
//
// The derived password is HMAC(wallet, WALLET_AUTH_SECRET) — only the server
// can compute it, and only after a fresh, valid wallet signature.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createHmac } from "crypto";

const WalletSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a Base/EVM address")
  .transform((v) => v.toLowerCase());

const NONCE_TTL_MS = 10 * 60 * 1000;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function buildMessage(wallet: string, nonce: string, origin: string): string {
  return [
    `SPX402 wants you to sign in with your Base account:`,
    wallet,
    ``,
    `Sign to authenticate your SPX402 terminal session. This request costs no gas.`,
    ``,
    `URI: ${origin}`,
    `Version: 1`,
    `Chain ID: 8453`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

function derivedPassword(wallet: string): string {
  const secret = process.env["WALLET_AUTH_SECRET"];
  if (!secret) throw new Error("Wallet sign-in is not configured");
  return createHmac("sha256", secret).update(`spx402-wallet:${wallet}`).digest("hex");
}

export function walletEmail(wallet: string): string {
  return `${wallet}@wallet.spx402.com`;
}

export const getWalletAuthMessage = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ wallet: WalletSchema, origin: z.string().url() }).parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();

    // Basic abuse control — nonces are cheap but the table is finite.
    await sb.rpc("rate_limit_hit" as never, {
      p_bucket: `wallet_nonce:${data.wallet}`,
      p_window_seconds: 600,
      p_limit: 10,
    } as never);

    const nonce = crypto.randomUUID().replace(/-/g, "");
    const { error } = await sb.from("wallet_auth_nonces" as never).upsert({
      wallet: data.wallet,
      nonce,
      expires_at: new Date(Date.now() + NONCE_TTL_MS).toISOString(),
    } as never);
    if (error) throw new Error("Could not create sign-in challenge");

    return { message: buildMessage(data.wallet, nonce, data.origin) };
  });

export const verifyWalletSignature = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        wallet: WalletSchema,
        signature: z.string().regex(/^0x[0-9a-fA-F]+$/, "Invalid signature"),
        origin: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();

    // Burn the nonce first — one challenge, one attempt window.
    const { data: nonceRow } = await sb
      .from("wallet_auth_nonces" as never)
      .select("nonce, expires_at")
      .eq("wallet", data.wallet)
      .maybeSingle();
    await sb.from("wallet_auth_nonces" as never).delete().eq("wallet", data.wallet);

    const row = nonceRow as { nonce: string; expires_at: string } | null;
    if (!row) throw new Error("No sign-in challenge found — request a new one");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Sign-in challenge expired — request a new one");
    }

    const message = buildMessage(data.wallet, row.nonce, data.origin);
    const rpcUrl = process.env["BASE_RPC_URL"] ?? "https://mainnet.base.org";
    const client = createPublicClient({ chain: base, transport: http(rpcUrl) });

    let valid = false;
    try {
      // Supports both EOAs (EIP-191) and Coinbase Smart Wallets (ERC-1271).
      valid = await client.verifyMessage({
        address: data.wallet as `0x${string}`,
        message,
        signature: data.signature as `0x${string}`,
      });
    } catch {
      valid = false;
    }
    if (!valid) throw new Error("Signature verification failed");

    const email = walletEmail(data.wallet);
    const password = derivedPassword(data.wallet);

    // Find-or-create the auth user keyed by this wallet.
    const { data: existing, error: createError } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { base_wallet: data.wallet, display_name: shortWallet(data.wallet) },
    });

    let userId: string;
    if (existing?.user) {
      userId = existing.user.id;
    } else if (createError) {
      // Already registered — rotate the password for this login.
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users?.find((u) => u.email === email);
      if (!found) throw new Error("Account lookup failed");
      const { error: updErr } = await sb.auth.admin.updateUserById(found.id, { password });
      if (updErr) throw new Error("Could not refresh credentials");
      userId = found.id;
    } else {
      throw new Error("Account creation failed");
    }

    // Link the wallet on the profile (display_name fallback too).
    await sb
      .from("profiles")
      .update({
        base_wallet: data.wallet,
        display_name: shortWallet(data.wallet),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return { email, password };
  });

function shortWallet(w: string): string {
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}
