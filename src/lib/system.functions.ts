// Public, read-only system facts that only the server can see: whether the
// prober is enabled, and which wallets it pays from. Wallet addresses are
// deliberately public — the prober is audited by the same pipeline it feeds.
//
// No secrets cross this boundary: keys are only reported as present/absent.

import { createServerFn } from "@tanstack/react-start";

export interface ProberPublicConfig {
  enabled: boolean;
  hasSolanaKey: boolean;
  hasBaseKey: boolean;
  solanaWallet: string | null;
  baseWallet: string | null;
}

export const getProberPublicConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProberPublicConfig> => {
    const flag = (process.env["PROBER_ENABLED"] ?? "").trim().toLowerCase();
    return {
      enabled: flag === "true" || flag === "1" || flag === "yes",
      hasSolanaKey: Boolean(process.env["PROBER_SOLANA_KEY"]),
      hasBaseKey: Boolean(process.env["PROBER_BASE_KEY"]),
      solanaWallet: process.env["PROBER_SOLANA_WALLET"] ?? null,
      baseWallet: process.env["PROBER_BASE_WALLET"] ?? null,
    };
  },
);
