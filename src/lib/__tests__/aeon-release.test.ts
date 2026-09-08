import { describe, expect, it } from "vitest";
import { getAeonReleaseStatus } from "../aeon-release";
import { AEON_PROGRAM_ID_DEVNET } from "../trust/config";

describe("getAeonReleaseStatus", () => {
  it("reports the documented devnet program and never claims mainnet", () => {
    const s = getAeonReleaseStatus({ NODE_ENV: "production", AEON_PROGRAM_ID: "" });
    expect(s.release_status).toBe("devnet");
    expect(s.mainnet_status).toBe("not_deployed");
    expect(s.program_address).toBe(AEON_PROGRAM_ID_DEVNET);
    expect(s.pipeline_enabled).toBe(false);
    expect(s.grading).toBe("withheld");
    expect(s.attestations).toBe("disabled");
  });

  it("still withholds grading when the production env tries to use the devnet ID", () => {
    expect(() =>
      getAeonReleaseStatus({
        NODE_ENV: "production",
        AEON_PROGRAM_ID: AEON_PROGRAM_ID_DEVNET,
      }),
    ).not.toThrow();
    const s = getAeonReleaseStatus({
      NODE_ENV: "production",
      AEON_PROGRAM_ID: AEON_PROGRAM_ID_DEVNET,
    });
    expect(s.pipeline_enabled).toBe(false);
    expect(s.grading).toBe("withheld");
  });

  it("enables the pipeline flag only outside production with AEON_ALLOW_DEVNET", () => {
    const s = getAeonReleaseStatus({
      NODE_ENV: "development",
      AEON_PROGRAM_ID: AEON_PROGRAM_ID_DEVNET,
      AEON_ALLOW_DEVNET: "true",
    });
    expect(s.pipeline_enabled).toBe(true);
    expect(s.grading).toBe("enabled");
    expect(s.mainnet_status).toBe("not_deployed");
  });
});
