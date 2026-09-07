// Tier 3 — machine-readable surface contracts.
//
// These assert the generated text/JSON shape (no network needed) plus the
// MCP tool registry: the two new tools must exist, be described, and must
// not advertise private fields.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildAgentCard, buildLlmsFullTxt, buildLlmsTxt } from "@/lib/machine-copy";

const ORIGIN = "https://spx402.com";

describe("llms.txt", () => {
  const txt = buildLlmsTxt(ORIGIN);

  it("leads with the product statement and payment policy", () => {
    expect(txt.startsWith("# SPX402")).toBe(true);
    expect(txt).toContain("on-chain reputation terminal");
    expect(txt).toContain("no free tier on the paid resources");
  });

  it("lists the nav hubs and the machine endpoints with absolute URLs", () => {
    expect(txt).toContain(`${ORIGIN}/registry/explore`);
    expect(txt).toContain(`${ORIGIN}/api/public/mcp`);
    expect(txt).toContain(`${ORIGIN}/.well-known/agent-card.json`);
    expect(txt).not.toMatch(/\]\(\/[a-z]/); // no relative links
  });

  it("prices the paid endpoints", () => {
    expect(txt).toMatch(/USDC\)/);
  });
});

describe("llms-full.txt", () => {
  const full = buildLlmsFullTxt(ORIGIN);

  it("is a superset of the short map", () => {
    expect(full).toContain(buildLlmsTxt(ORIGIN).trim().slice(0, 200));
  });

  it("states the model versions and changelog", () => {
    expect(full).toContain("spx-score-v0.4.0");
    expect(full).toContain("## Version changelog");
    expect(full).toContain("## Model versions");
  });
});

describe("agent-card.json", () => {
  const card = buildAgentCard(ORIGIN) as Record<string, any>;

  it("declares identity, docs and interfaces", () => {
    expect(card["name"]).toBe("SPX402");
    expect(card["documentationUrl"]).toBe(`${ORIGIN}/build/docs`);
    expect(card["interfaces"].mcp).toBe(`${ORIGIN}/api/public/mcp`);
    expect(card["interfaces"].x402).toBe(`${ORIGIN}/.well-known/x402`);
  });

  it("lists the four public skills", () => {
    expect(card["skills"].map((s: { id: string }) => s.id)).toEqual([
      "agent_grade_lookup",
      "execution_tape",
      "facilitator_registry",
      "evidence_bundle",
    ]);
  });

  it("repeats the pay-per-call policy verbatim", () => {
    expect(card["payments"].policy).toContain("does not sponsor gas");
    expect(card["payments"].network).toBe("base");
  });

  it("serializes as JSON", () => {
    expect(() => JSON.stringify(card)).not.toThrow();
  });
});

describe("MCP server route", () => {
  const src = readFileSync("src/routes/api/public/mcp.ts", "utf8");

  it("still answers POST JSON-RPC and a GET descriptor", () => {
    expect(src).toContain("POST:");
    expect(src).toContain("GET:");
    expect(src).toContain("tools/call");
    expect(src).toContain("tools/list");
    expect(src).toContain("initialize");
  });

  it("registers the two new public tools", () => {
    expect(src).toContain("spx_get_evidence_summary");
    expect(src).toContain("spx_get_operator");
    expect(src).toContain('case "spx_get_evidence_summary"');
    expect(src).toContain('case "spx_get_operator"');
  });

  it("exposes no private columns through the new tools", () => {
    for (const forbidden of ["user_id", "api_key", "email", "secret", "owner_id"]) {
      expect(src.includes(forbidden)).toBe(false);
    }
  });
});

describe("robots.txt", () => {
  const robots = readFileSync("public/robots.txt", "utf8");

  it("keeps /api/ closed but opens the machine surfaces", () => {
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Allow: /api/public/mcp");
    expect(robots).toContain("Allow: /.well-known/");
    expect(robots).toContain("Allow: /llms.txt");
    expect(robots).toContain("Allow: /llms-full.txt");
  });
});
