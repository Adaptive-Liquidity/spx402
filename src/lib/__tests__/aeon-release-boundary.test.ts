// Static guard: getAeonReleaseStatus() reads process.env and must stay
// server-only. TanStack Start route loaders are isomorphic, so the
// /aeon-agents page must reach it through the createServerFn boundary.

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AEON release status server boundary", () => {
  it("the env-reading module carries the .server.ts suffix", () => {
    expect(existsSync("src/lib/aeon-release.server.ts")).toBe(true);
    expect(existsSync("src/lib/aeon-release.ts")).toBe(false);
  });

  it("the /aeon-agents route reaches release status only through the server function", () => {
    const src = readFileSync("src/routes/aeon-agents.tsx", "utf8");
    expect(src).toContain("@/lib/aeon-release.functions");
    expect(src).not.toMatch(/from "@\/lib\/aeon-release(\.server)?"/);
  });

  it("only server-side modules import the release helper", () => {
    const api = readFileSync("src/routes/api.aeon.release-status.ts", "utf8");
    expect(api).toContain("@/lib/aeon-release.server");
    const fn = readFileSync("src/lib/aeon-release.functions.ts", "utf8");
    expect(fn).toContain("createServerFn");
    expect(fn).toContain("@/lib/aeon-release.server");
  });
});
