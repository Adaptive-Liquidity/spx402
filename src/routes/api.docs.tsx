import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/spx/Panel";
import { CopyButton } from "@/components/spx/CopyButton";

const BASE_URL = "https://api.spx402.xyz";

function EndpointCard({
  method,
  path,
  price,
  title,
  description,
  request,
  response,
  curl,
}: {
  method: "GET" | "POST";
  path: string;
  price?: string;
  title: string;
  description: string;
  request?: string;
  response?: string;
  curl: string;
}) {
  return (
    <Panel eyebrow={`${method} ${path}`} title={title}>
      <p className="text-paper-muted">{description}</p>
      {price && (
        <div className="mt-3 inline-flex items-center gap-2 border border-amber/60 bg-amber/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber">
          <span>💰 Price: {price}</span>
        </div>
      )}
      <div className="mt-4 space-y-3">
        <CopyButton value={curl} label="Copy cURL" />
        {request && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-wire">Request</div>
            <pre className="mt-1 overflow-x-auto border border-bronze/50 bg-panel-deep p-3 font-mono text-[11px] leading-relaxed text-paper">
              {request}
            </pre>
          </div>
        )}
        {response && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
              Response (200 OK)
            </div>
            <pre className="mt-1 overflow-x-auto border border-bronze/50 bg-panel-deep p-3 font-mono text-[11px] leading-relaxed text-paper">
              {response}
            </pre>
          </div>
        )}
      </div>
    </Panel>
  );
}

export const Route = createFileRoute("/api/docs")({
  head: () => ({
    meta: [
      { title: "API Docs — SPX402" },
      {
        name: "description",
        content: "Endpoint reference, authentication, x402 pay-per-call docs.",
      },
    ],
  }),
  component: ApiDocsPage,
});

function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">API · v1</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-paper">Endpoint reference.</h1>
      <p className="mt-5 max-w-2xl text-paper-muted">
        SPX402 exposes execution data over two layers:
        <br />
        <strong>REST API</strong> — API key auth, rate-limited tiers (Free/Pro/Team).
        <br />
        <strong>x402 Pay-per-Call</strong> — No account needed. Machines pay USDC per request via
        HTTP 402.
        <br />
        All endpoints return JSON. All times are UTC ISO 8601.
      </p>

      <div className="mt-10 panel-engraved p-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-amber">
          Authentication
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Panel eyebrow="REST API (API Key)">
            <p className="text-paper-muted">
              Include your API key in the{" "}
              <code className="font-mono text-[11px] bg-panel-deep px-1.5 py-0.5 rounded">
                Authorization
              </code>{" "}
              header. Get keys from your{" "}
              <a href="/dashboard/api-keys" className="text-amber hover:underline">
                dashboard
              </a>
              .
            </p>
            <pre className="mt-3 overflow-x-auto border border-bronze/50 bg-panel-deep p-3 font-mono text-[11px] leading-relaxed text-paper">
              {curl_cmd}
            </pre>
          </Panel>
          <Panel eyebrow="x402 Pay-per-Call">
            <p className="text-paper-muted">
              No API key needed. Client receives HTTP 402 with payment quote, pays on Base, retries
              with payment proof. Uses{" "}
              <a href="https://x402.org" target="_blank" className="text-amber hover:underline">
                x402 protocol
              </a>
              .
            </p>
            <pre className="mt-3 overflow-x-auto border border-bronze/50 bg-panel-deep p-3 font-mono text-[11px] leading-relaxed text-paper">
              {curl_x402}
            </pre>
          </Panel>
        </div>
      </div>

      <div className="mt-12 space-y-8">
        {/* SCORE ENDPOINT */}
        <EndpointCard
          method="GET"
          path="/v1/agent/:mint/score"
          price="0.01 USDC"
          title="Execution Score (Lightweight)"
          description="Current SPX grade, score, active bond, and escrow success rate. Optimized for fast agent-to-agent verification."
          curl={`curl -H "X-Payment: <x402_proof>" \\
  ${BASE_URL}/v1/agent/7xKQ92.../score`}
          response={JSON.stringify(
            {
              mint: "7xKQ92...",
              symbol: "NOVA",
              name: "Agent Nova",
              grade: "SPX AA",
              score: 87,
              confidence: "high",
              activeBond: 12500,
              escrowSuccessRate: 0.99,
              totalSlashed: 0,
              escrowsCompleted: 142,
              escrowsFailed: 0,
              lastIndexed: "2026-04-24T16:56:25Z",
              operatorVerified: true,
              category: "aeon_executor",
              chain: "solana",
            },
            null,
            2,
          )}
        />

        {/* DOSSIER ENDPOINT */}
        <EndpointCard
          method="GET"
          path="/v1/agent/:mint/dossier"
          price="0.05 USDC"
          title="Full Agent Dossier"
          description="Complete terminal data: all execution events, SVG terminal card, verdict, and configuration. For wallets/DEXs displaying full context."
          curl={`curl -H "X-Payment: <x402_proof>" \\
  ${BASE_URL}/v1/agent/7xKQ92.../dossier`}
          response={`{
  "mint": "7xKQ92...",
  "symbol": "NOVA",
  "name": "Agent Nova",
  "grade": "SPX AA",
  "score": 87,
  "verdict": "Verified execution. 142 escrows settled (99% success) with $12,500 bonded.",
  "activeBond": 12500,
  "escrowSuccessRate": 0.99,
  "totalSlashed": 0,
  "escrowsCompleted": 142,
  "escrowsFailed": 0,
  "events": [...],
  "svgCard": "<svg>...</svg>",
  "disclaimer": "SPX402 grades observable on-chain execution only..."
}`}
        />

        {/* EVIDENCE ENDPOINT */}
        <EndpointCard
          method="GET"
          path="/v1/agent/:mint/evidence"
          price="0.05 USDC"
          title="Audit Evidence Bundle (Merkle-Rooted)"
          description="Cryptographically verifiable proof bundle. Contains Merkle root of all execution events, individual proofs, and full event log. For institutional audit and compliance."
          curl={`curl -H "X-Payment: <x402_proof>" \\
  ${BASE_URL}/v1/agent/7xKQ92.../evidence`}
          response={`{
  "mint": "7xKQ92...",
  "symbol": "NOVA",
  "grade": "SPX AA",
  "merkleRoot": "0xabc123...",
  "merkleProofs": [["0xdef456...", "0x789..."], ...],
  "leaves": ["0x123...", "0x456...", ...],
  "windowStart": "2026-03-24T00:00:00Z",
  "windowEnd": "2026-04-24T00:00:00Z",
  "eventCount": 287,
  "events": [...],
  "verification": { "spx402Version": "1.0", "generatedAt": "..." }
}`}
        />

        {/* REST API ENDPOINTS (API Key) */}
        <Panel
          eyebrow="GET /v1/agent/:mint/score (REST + API Key)"
          title="REST Score — API Key Auth"
        >
          <p className="text-paper-muted">
            Same data as x402 score endpoint, but authenticated via API key. Free tier: 100
            calls/day.
          </p>
          <pre className="mt-3 overflow-x-auto border border-bronze/50 bg-panel-deep p-3 font-mono text-[11px] leading-relaxed text-paper">
            {curl_rest}
          </pre>
        </Panel>

        <Panel
          eyebrow="GET /v1/agent/:mint/dossier (REST + API Key)"
          title="REST Dossier — API Key Auth"
        >
          <p className="text-paper-muted">
            Same data as x402 dossier endpoint. Pro tier: 10,000 calls/day.
          </p>
          <pre className="mt-3 overflow-x-auto border border-bronze/50 bg-panel-deep p-3 font-mono text-[11px] leading-relaxed text-paper">
            {curl_rest_dossier}
          </pre>
        </Panel>

        {/* TIER TABLE */}
        <Panel eyebrow="Pricing & Rate Limits" title="API Tiers">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-sm">
              <thead>
                <tr className="border-b border-bronze/40 text-wire">
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Monthly</th>
                  <th className="text-left p-3">Daily Limit (REST)</th>
                  <th className="text-left p-3">x402 Price</th>
                  <th className="text-left p-3">Best For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bronze/20">
                <tr>
                  <td className="p-3 text-verified font-bold">Free</td>
                  <td className="p-3">$0</td>
                  <td className="p-3">100 calls/day</td>
                  <td className="p-3">0.01 / 0.05 USDC</td>
                  <td className="p-3">Testing, individual devs</td>
                </tr>
                <tr>
                  <td className="p-3 text-amber font-bold">Pro</td>
                  <td className="p-3">$49/mo</td>
                  <td className="p-3">10,000 calls/day</td>
                  <td className="p-3">0.01 / 0.05 USDC</td>
                  <td className="p-3">Serious builders, bots</td>
                </tr>
                <tr>
                  <td className="p-3 text-paper font-bold">Team</td>
                  <td className="p-3">$149/mo</td>
                  <td className="p-3">100,000 calls/day</td>
                  <td className="p-3">0.01 / 0.05 USDC</td>
                  <td className="p-3">DEXs, wallets, platforms</td>
                </tr>
                <tr>
                  <td className="p-3 text-paper font-bold">Enterprise</td>
                  <td className="p-3">Custom</td>
                  <td className="p-3">Unlimited + SLA</td>
                  <td className="p-3">Volume discount</td>
                  <td className="p-3">Institutions, launchpads</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        {/* WEBHOOKS */}
        <Panel eyebrow="Webhooks (Team + Enterprise)" title="Real-time Event Delivery">
          <p className="text-paper-muted">
            Subscribe to execution events. SPX402 delivers with exponential backoff and idempotent
            keys.
          </p>
          <pre className="mt-3 overflow-x-auto border border-bronze/50 bg-panel-deep p-3 font-mono text-[11px] leading-relaxed text-paper">
            {webhook_payload}
          </pre>
          <div className="mt-3 space-y-2 font-mono text-xs">
            <div className="text-wire">Event Types:</div>
            <div className="text-paper-muted">
              ESCROW_CREATED, ESCROW_RELEASED, ESCROW_CANCELED, BOND_DEPOSITED, BOND_SLASHED,
              RECEIPT_CREATED, DEPOSIT_RECEIVED, BUYBACK_EXECUTED, BURN_CONFIRMED, FAILED_WINDOW,
              ANOMALY_DETECTED, OPERATOR_VERIFIED
            </div>
          </div>
        </Panel>

        {/* INTEGRATION GUIDES */}
        <Panel eyebrow="Integration Quickstarts" title="Wallet / DEX / Agent Integration">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel title="Wallet (Phantom/Backpack)" className="md:col-span-1">
              <ol className="space-y-2 text-sm text-paper-muted list-decimal list-inside">
                <li>
                  Call{" "}
                  <code className="font-mono bg-panel-deep px-1 rounded">
                    /v1/agent/:mint/score
                  </code>{" "}
                  before user confirms tx
                </li>
                <li>
                  If <code className="font-mono bg-panel-deep px-1 rounded">grade &lt; SPX A</code>{" "}
                  → show warning badge
                </li>
                <li>Cache for 5 min to avoid rate limits</li>
              </ol>
            </Panel>
            <Panel title="DEX (Raydium/Orca)" className="md:col-span-1">
              <ol className="space-y-2 text-sm text-paper-muted list-decimal list-inside">
                <li>Display SPX badge next to token in pool list</li>
                <li>
                  Auto-hide pools with{" "}
                  <code className="font-mono bg-panel-deep px-1 rounded">SPX D / SPX404</code>
                </li>
                <li>Use webhook for real-time grade changes</li>
              </ol>
            </Panel>
            <Panel title="AI Agent (AutoGPT/LangChain)" className="md:col-span-1">
              <ol className="space-y-2 text-sm text-paper-muted list-decimal list-inside">
                <li>
                  Before delegating task:{" "}
                  <code className="font-mono bg-panel-deep px-1 rounded">GET /score</code>
                </li>
                <li>
                  If{" "}
                  <code className="font-mono bg-panel-deep px-1 rounded">
                    activeBond &gt; taskValue
                  </code>{" "}
                  → proceed
                </li>
                <li>Log result to SPX402 via AEON escrow</li>
              </ol>
            </Panel>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const curl_cmd = `curl -H "Authorization: Bearer spx_live_abc123..." \\
  ${BASE_URL}/v1/agent/7xKQ92.../score`;

const curl_rest = `curl -H "Authorization: Bearer spx_live_abc123..." \\
  ${BASE_URL}/v1/agent/7xKQ92.../score`;

const curl_rest_dossier = `curl -H "Authorization: Bearer spx_live_abc123..." \\
  ${BASE_URL}/v1/agent/7xKQ92.../dossier`;

const curl_x402 = `# Step 1: Request (no auth)
curl ${BASE_URL}/v1/agent/7xKQ92.../score

# Response: 402 Payment Required
# {
#   "x402": {
#     "x402Version": 1,
#     "scheme": "exact",
#     "network": "base",
#     "maxAmountRequired": "10000",
#     "resource": "/v1/agent/7xKQ92.../score",
#     "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
#     "payTo": "0xYourTreasury...",
#     "maxDeadline": 1724515200,
#     ...
#   }
# }

# Step 2: Pay 0.01 USDC on Base to payTo address
# (using your wallet / smart contract)

# Step 3: Retry with payment proof
curl -H "X-Payment: <base64_x402_payment_proof>" \\
  ${BASE_URL}/v1/agent/7xKQ92.../score`;

const webhook_payload = `POST https://your-webhook-url.com/spx402
Content-Type: application/json
X-SPX-Signature: sha256=abc123...
X-SPX-Delivery: evt_01HXYZ...
X-SPX-Timestamp: 2026-04-24T16:42:11Z

{
  "id": "evt_01HXYZ...",
  "agentMint": "7xKQ92...",
  "type": "ESCROW_RELEASED",
  "occurredAt": "2026-04-24T16:42:11Z",
  "data": {
    "escrowId": "esc_abc123",
    "amountSol": 2.1,
    "releasedTo": "agent_wallet...",
    "transactionSignature": "novax...Q"
  }
}`;
