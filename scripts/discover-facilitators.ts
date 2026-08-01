// Local-only, DRY-RUN facilitator discovery.
//
// Fetches GET /supported from a hardcoded list of x402 facilitator base URLs
// and prints any Solana-lane kinds together with their published
// `extra.feePayer`. Output is a PROPOSAL: an inactive registry row plus the
// capture command needed to activate it.
//
// This tool never writes files, never touches the database, and never
// activates anything. Activation still requires a captured settlement
// fixture and the DB activation guard (fixture_id + address).
//
// Usage:
//   bun scripts/discover-facilitators.ts

import { FACILITATOR_SEED } from "../src/lib/indexer/facilitators.server";

const FACILITATOR_BASE_URLS = [
  "https://facilitator.payai.network",
  // add operator base URLs here as they publish a /supported endpoint
];

interface SupportedKind {
  x402Version?: number;
  scheme?: string;
  network?: string;
  extra?: Record<string, unknown>;
}

function isSolanaNetwork(network: string): boolean {
  const n = network.toLowerCase();
  return n === "solana" || n.startsWith("solana:") || n.startsWith("solana-");
}

// Mainnet genesis hash used as the CAIP-2 reference for Solana mainnet-beta.
const SOLANA_MAINNET_REF = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

function isMainnet(network: string): boolean {
  const n = network.toLowerCase();
  if (n === "solana") return true;
  if (n.includes("devnet") || n.includes("testnet")) return false;
  return n.includes(SOLANA_MAINNET_REF.toLowerCase());
}

async function inspect(base: string): Promise<void> {
  const url = `${base.replace(/\/$/, "")}/supported`;
  console.log(`\n=== ${url}`);
  let kinds: SupportedKind[] = [];
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      console.log(`  unreachable: HTTP ${res.status}`);
      return;
    }
    const body = (await res.json()) as { kinds?: SupportedKind[] };
    kinds = body.kinds ?? [];
  } catch (err) {
    console.log(`  unreachable: ${(err as Error).message}`);
    return;
  }

  const solana = kinds.filter((k) => isSolanaNetwork(String(k.network ?? "")));
  if (solana.length === 0) {
    console.log("  no solana:* kinds published");
    return;
  }

  const seen = new Set<string>();
  for (const k of solana) {
    const network = String(k.network);
    const feePayer = (k.extra as { feePayer?: string } | undefined)?.feePayer;
    const mainnet = isMainnet(network);
    console.log(
      `  ${network.padEnd(46)} scheme=${k.scheme ?? "?"} v${k.x402Version ?? "?"} feePayer=${feePayer ?? "(none published)"}${mainnet ? "" : "  [non-mainnet]"}`,
    );
    if (!feePayer || !mainnet || seen.has(feePayer)) continue;
    seen.add(feePayer);

    const known = FACILITATOR_SEED.find((f) => f.address === feePayer);
    if (known) {
      console.log(
        `    → already in registry as "${known.id}" (active=${known.active}, fixtureId=${known.fixtureId ?? "null"})`,
      );
      continue;
    }

    const host = new URL(url).hostname.replace(/^facilitator\./, "");
    const id = `${host.split(".")[0]}-solana`;
    console.log("    → PROPOSED registry row (INACTIVE — requires a fixture):");
    console.log(
      JSON.stringify(
        {
          id,
          name: `${host} Facilitator (Solana)`,
          chain: "solana",
          address: feePayer,
          scheme: k.scheme ?? "exact",
          sourceUrl: url,
          fixtureId: null,
          active: false,
        },
        null,
        2,
      )
        .split("\n")
        .map((l) => `      ${l}`)
        .join("\n"),
    );
    console.log("    → to activate, capture a settlement fixture first:");
    console.log(
      `      HELIUS_API_KEY=... bun scripts/capture-fixture.ts --id x402-facilitator-settlement-XX --signature <sig>`,
    );
  }
}

async function main() {
  console.log("x402 facilitator discovery — DRY RUN (nothing is written or activated)");
  for (const base of FACILITATOR_BASE_URLS) {
    await inspect(base);
  }
  console.log(
    "\nDone. No registry row is activated by this tool: activation requires a captured fixture and passes the DB activation guard.",
  );
}

main();
