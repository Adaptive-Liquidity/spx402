import { describe, expect, it } from "vitest";
import { AEON_PROGRAM_ID_DEVNET, requireAeonProgramId, resolveAeonProgramId } from "../config";

const MAINNET_ID = "So11111111111111111111111111111111111111112";

describe("resolveAeonProgramId boot matrix", () => {
  it("empty ID disables the pipeline in any env", () => {
    expect(resolveAeonProgramId({ NODE_ENV: "production" })).toEqual({
      enabled: false,
      reason: "not_configured",
    });
    expect(resolveAeonProgramId({ NODE_ENV: "development" })).toEqual({
      enabled: false,
      reason: "not_configured",
    });
  });

  it("devnet ID in production hard-fails", () => {
    expect(() =>
      resolveAeonProgramId({ NODE_ENV: "production", AEON_PROGRAM_ID: AEON_PROGRAM_ID_DEVNET }),
    ).toThrow(/devnet program ID in production/);
  });

  it("devnet ID outside production requires the explicit flag", () => {
    expect(
      resolveAeonProgramId({ NODE_ENV: "development", AEON_PROGRAM_ID: AEON_PROGRAM_ID_DEVNET }),
    ).toEqual({ enabled: false, reason: "devnet_rejected" });
    expect(
      resolveAeonProgramId({
        NODE_ENV: "development",
        AEON_PROGRAM_ID: AEON_PROGRAM_ID_DEVNET,
        AEON_ALLOW_DEVNET: "true",
      }),
    ).toEqual({ enabled: true, programId: AEON_PROGRAM_ID_DEVNET });
  });

  it("a non-devnet ID enables the pipeline", () => {
    expect(resolveAeonProgramId({ NODE_ENV: "production", AEON_PROGRAM_ID: MAINNET_ID })).toEqual({
      enabled: true,
      programId: MAINNET_ID,
    });
  });

  it("requireAeonProgramId throws with the disable reason", () => {
    expect(() => requireAeonProgramId({ NODE_ENV: "production" })).toThrow(/not_configured/);
    expect(requireAeonProgramId({ NODE_ENV: "production", AEON_PROGRAM_ID: MAINNET_ID })).toBe(
      MAINNET_ID,
    );
  });
});
