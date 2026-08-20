// Copy contract tests.
//
// Two surfaces carry text that was specified word-for-word and must not drift:
// the /methodology "Active verification" section (which states the rules the
// prober operates under and the "not yet scored" guarantee) and the agent
// dossier anomaly panel. These assert the rendered strings verbatim.
//
// The methodology assertions run against the live dev server when it is
// reachable (true end-to-end SSR output); otherwise they fall back to the
// route source so the contract is still enforced in CI.

import { readFileSync } from "node:fs";
import { describe, expect, it, beforeAll } from "vitest";

const BASE_URL = process.env["E2E_BASE_URL"] ?? "http://localhost:8080";

/** Collapse JSX/HTML into comparable prose: strip tags, join whitespace. */
function prose(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\{"\s*"\}/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const METHODOLOGY_VERBATIM = [
  "Active verification",
  "Passive indexing can only see payments that happened.",
  "Challenge validity — is the 402 body well-formed and priced?",
  "Settlement rate — does the payment actually settle?",
  "Delivery — did the paid response contain a resource?",
  "No covert probing. Every request carries User-Agent: SPX402-Probe/1.0 .",
  "Hard caps: $0.05 per probe, $10 per UTC day, no retries.",
  "Probe data is not yet scored",
  "collected and displayed only",
  "No probe outcome contributes to an SPX Execution Score, grade, or confidence value.",
  "Prober wallets",
];

const ANOMALY_VERBATIM = [
  "No critical anomalies detected.",
  "This is uncommon. Enjoy it quietly.",
  "Execution gap",
  "failed buyback windows observed. The tape has developed a limp.",
  "Operator silence",
  "Operator has not signed a verification. SPX402 cannot attest to control.",
  "Minor drift",
  "failed windows recorded. SPX402 has opened a file.",
];

async function fetchProse(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return prose(await res.text());
  } catch {
    return null;
  }
}

describe("/methodology active-verification copy", () => {
  let text = "";
  let source: "server" | "source" = "source";

  beforeAll(async () => {
    const served = await fetchProse("/methodology");
    if (served) {
      text = served;
      source = "server";
    } else {
      text = prose(readFileSync("src/routes/methodology.tsx", "utf8"));
    }
  });

  it("reports which surface it verified", () => {
    expect(["server", "source"]).toContain(source);
    expect(text.length).toBeGreaterThan(500);
  });

  for (const line of METHODOLOGY_VERBATIM) {
    it(`renders verbatim: "${line.slice(0, 56)}"`, () => {
      expect(text).toContain(line);
    });
  }
});

describe("agent dossier anomaly panel copy", () => {
  const source = prose(readFileSync("src/routes/agent.$mint.tsx", "utf8"));

  for (const line of ANOMALY_VERBATIM) {
    it(`renders verbatim: "${line.slice(0, 56)}"`, () => {
      expect(source).toContain(line);
    });
  }
});
