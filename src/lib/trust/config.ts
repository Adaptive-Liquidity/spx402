// AEON program-ID guard (trust-engine P3). Single choke point for every
// AEON-gated path: decoder, listener, verifier, scoring, attestation,
// leaderboard eligibility.
//
// Production rules (fail closed):
//   - empty AEON_PROGRAM_ID  -> pipeline disabled (explicit, logged)
//   - devnet ID in production -> throw at boot; health checks must fail
// Devnet fallback is allowed ONLY outside production AND only with
// AEON_ALLOW_DEVNET=true. There is no silent default.

import bs58 from "bs58";

/** AEON v0.2 devnet program. Never valid as production config. */
export const AEON_PROGRAM_ID_DEVNET = "TcZ9MKNw4eGvoe3K75e4M3zCwZCzEsb6WvrS8LqNgdm";

/** True when the value decodes as Base58 to exactly 32 bytes (a Solana address). */
export function isValidProgramId(value: string): boolean {
  try {
    return bs58.decode(value).length === 32;
  } catch {
    return false;
  }
}

export type AeonPipelineState =
  | { enabled: true; programId: string }
  | { enabled: false; reason: "not_configured" | "devnet_rejected" | "invalid_config" };

function isProduction(env: { NODE_ENV?: string }): boolean {
  return env["NODE_ENV"] === "production";
}

/**
 * Resolve the AEON program ID or fail closed. Pure function of env so the
 * boot matrix is unit-testable without touching process.env.
 */
export function resolveAeonProgramId(
  env: {
    NODE_ENV?: string;
    AEON_PROGRAM_ID?: string;
    AEON_ALLOW_DEVNET?: string;
  } = process.env,
): AeonPipelineState {
  const id = (env["AEON_PROGRAM_ID"] ?? "").trim();
  if (!id) return { enabled: false, reason: "not_configured" };
  if (!isValidProgramId(id)) {
    throw new Error(
      "AEON_PROGRAM_ID is not a valid Solana program ID (Base58, 32 bytes). Refusing to start AEON pipeline.",
    );
  }
  if (id === AEON_PROGRAM_ID_DEVNET) {
    if (isProduction(env)) {
      throw new Error(
        "AEON_PROGRAM_ID is the devnet program ID in production. Refusing to start AEON pipeline.",
      );
    }
    if (env["AEON_ALLOW_DEVNET"] !== "true") {
      return { enabled: false, reason: "devnet_rejected" };
    }
  }
  return { enabled: true, programId: id };
}

/**
 * Choke point. Every AEON-gated path must call this (never read
 * AEON_PROGRAM_ID directly). Returns the program ID or throws with the
 * disable reason.
 */
export function requireAeonProgramId(
  env: {
    NODE_ENV?: string;
    AEON_PROGRAM_ID?: string;
    AEON_ALLOW_DEVNET?: string;
  } = process.env,
): string {
  const state = resolveAeonProgramId(env);
  if (!state.enabled) {
    throw new Error(`AEON pipeline disabled: ${state.reason}.`);
  }
  return state.programId;
}
