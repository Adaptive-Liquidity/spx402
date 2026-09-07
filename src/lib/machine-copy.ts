// Tier 3 — machine-readable surfaces (/llms.txt, /llms-full.txt,
// /.well-known/agent-card.json).
//
// Everything here is GENERATED from constants the pages already use — nav
// hubs, endpoint prices, tier quotas, parser/scoring versions, badge tiers.
// No new voice, no second copy of the product story that can drift from the
// site. Browser-safe: no secrets, no server imports.

import { NAV_HUBS } from "@/components/spx/nav-items";
import { ENDPOINT_PRICES, TIER_LIMITS, usdc } from "@/lib/api-tiers";
import { BADGE_TIERS, HONEST_GRADE_RULE } from "@/lib/badge-plans";
import { formatUsdc } from "@/lib/plans";
import {
  CONFIDENCE_VERSION,
  CORE_PARSER_VERSION,
  EVM_X402_PARSER_VERSION,
  FACILITATOR_REGISTRY_VERSION,
  PROBER_VERSION,
  SCORING_VERSION,
  SOLANA_X402_PARSER_VERSION,
  VERSION_CHANGELOG,
} from "@/lib/versions";

export const MACHINE_SUMMARY =
  "SPX402 is an on-chain reputation terminal for Solana and Base agents. Every grade is derived from indexed on-chain receipts — settlements, buybacks, burns, failures — never from self-reported claims.";

export const PAYMENT_POLICY =
  "Strictly pay-per-call with no free tier on the paid resources. SPX402 does not sponsor gas via any paymaster: callers and agents supply their own USDC settlement on Base and cover all execution fees.";

function hubLines(origin: string): string {
  return NAV_HUBS.map((hub) => {
    const items = hub.items.map((i) => `  - [${i.label}](${origin}${i.to})`).join("\n");
    return `### ${hub.label}\n\n${items}`;
  }).join("\n\n");
}

function paidLines(origin: string): string {
  return [
    `- \`GET ${origin}/api/v1/agent/{mint}/score\` — execution grade, score, bond, success rate (${usdc(ENDPOINT_PRICES.score)} USDC)`,
    `- \`GET ${origin}/api/v1/agent/{mint}/dossier\` — full dossier with events and SVG card (${usdc(ENDPOINT_PRICES.dossier)} USDC)`,
    `- \`GET ${origin}/api/v1/agent/{mint}/evidence\` — Merkle-rooted evidence bundle (${usdc(ENDPOINT_PRICES.evidence)} USDC)`,
  ].join("\n");
}

function freeLines(origin: string): string {
  return [
    `- \`GET ${origin}/api/public/verified\` — verified-agent feed (cursor paginated)`,
    `- \`GET ${origin}/api/public/agent/{subject}/evidence\` — public evidence bundle for a subject`,
    `- \`GET ${origin}/api/public/badge/{mint}.svg\` — embeddable grade badge`,
    `- \`GET ${origin}/api/public/mcp\` — MCP server descriptor (POST for JSON-RPC tool calls)`,
    `- \`GET ${origin}/.well-known/x402\` — x402 discovery manifest for the paid resources`,
    `- \`GET ${origin}/.well-known/agent-card.json\` — machine-readable agent card`,
  ].join("\n");
}

/** Short curated map — the llms.txt convention. */
export function buildLlmsTxt(origin: string): string {
  return `# SPX402

> ${MACHINE_SUMMARY}

${PAYMENT_POLICY}

## Pages

${hubLines(origin)}

## Free machine endpoints

${freeLines(origin)}

## Paid endpoints (x402, USDC on Base)

${paidLines(origin)}

API-key quotas per UTC day: free ${TIER_LIMITS.free.toLocaleString("en-US")}, pro ${TIER_LIMITS.pro.toLocaleString("en-US")}, team ${TIER_LIMITS.team.toLocaleString("en-US")}.

## Full version

- [llms-full.txt](${origin}/llms-full.txt)
`;
}

/** The map plus the versioned model detail, still generated from constants. */
export function buildLlmsFullTxt(origin: string): string {
  const changelog = VERSION_CHANGELOG.map(
    (row) => `- \`${row.version}\` (${row.lane}) — ${row.summary}`,
  ).join("\n");

  const badges = Object.values(BADGE_TIERS)
    .map(
      (t) =>
        `- ${t.name} — $${formatUsdc(t.priceUsdc)} USDC / ${t.days} days: ${t.features.join("; ")}`,
    )
    .join("\n");

  return `${buildLlmsTxt(origin)}
## Model versions

- Scoring: \`${SCORING_VERSION}\`
- Confidence: \`${CONFIDENCE_VERSION}\`
- Core decoder: \`${CORE_PARSER_VERSION}\`
- Solana x402 parser: \`${SOLANA_X402_PARSER_VERSION}\`
- Base/EVM x402 parser: \`${EVM_X402_PARSER_VERSION}\`
- Facilitator registry: \`${FACILITATOR_REGISTRY_VERSION}\`
- Active prober: \`${PROBER_VERSION}\`

Full methodology, grade bands, and the anomaly taxonomy are published at ${origin}/methodology.

## Version changelog

${changelog}

## Operator badge

${badges}

${HONEST_GRADE_RULE}
`;
}

/** A2A-style agent card. Points at the existing machine surfaces. */
export function buildAgentCard(origin: string): Record<string, unknown> {
  return {
    protocolVersion: "0.3.0",
    name: "SPX402",
    description: MACHINE_SUMMARY,
    url: origin,
    documentationUrl: `${origin}/build/docs`,
    provider: { organization: "SPX402", url: origin },
    version: SCORING_VERSION,
    defaultInputModes: ["application/json"],
    defaultOutputModes: ["application/json"],
    capabilities: { streaming: false, pushNotifications: false },
    skills: [
      {
        id: "agent_grade_lookup",
        name: "Agent grade lookup",
        description:
          "Return the SPX402 execution grade, score and confidence for one agent identifier.",
        tags: ["reputation", "solana", "base"],
      },
      {
        id: "execution_tape",
        name: "Execution tape",
        description: "Read recent verified on-chain agent events with severity and chain.",
        tags: ["events", "tape"],
      },
      {
        id: "facilitator_registry",
        name: "Facilitator registry",
        description: "List the x402 payment facilitators SPX402 tracks.",
        tags: ["x402", "facilitators"],
      },
      {
        id: "evidence_bundle",
        name: "Evidence bundle",
        description: "Merkle-rooted proof of execution over a subject's 30-day event window.",
        tags: ["evidence", "merkle"],
      },
    ],
    interfaces: {
      mcp: `${origin}/api/public/mcp`,
      x402: `${origin}/.well-known/x402`,
      verifiedFeed: `${origin}/api/public/verified`,
      llms: `${origin}/llms.txt`,
    },
    payments: {
      model: "pay-per-call",
      asset: "USDC",
      network: "base",
      policy: PAYMENT_POLICY,
      prices: {
        score: usdc(ENDPOINT_PRICES.score),
        dossier: usdc(ENDPOINT_PRICES.dossier),
        evidence: usdc(ENDPOINT_PRICES.evidence),
      },
    },
  };
}
