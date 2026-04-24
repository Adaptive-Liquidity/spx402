import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/spx/Panel";

export const Route = createFileRoute("/api/docs")({
  head: () => ({
    meta: [
      { title: "API Docs — SPX402" },
      { name: "description", content: "Endpoint reference, authentication, x402 pay-per-call docs." },
    ],
  }),
  component: ApiDocsPage,
});

const SECTIONS = [
  {
    title: "Authentication",
    body:
      "REST endpoints use a bearer API key. x402 endpoints require no account — clients pay USDC per request and receive a one-time response token.",
    code: `curl -H "Authorization: Bearer spx_live_..." \\
  https://api.spx402.xyz/v1/agent/7xKQ92.../score`,
  },
  {
    title: "Score endpoint",
    body: "Returns the current Transparency Score and grade for an agent.",
    code: `GET /v1/agent/:mint/score
{
  "grade": "SPX AA",
  "score": 87,
  "confidence": "high",
  "lastIndexedAt": "2026-04-24T16:56:25Z"
}`,
  },
  {
    title: "Timeline endpoint",
    body: "Returns decoded execution events in reverse chronological order. Paginated by slot.",
    code: `GET /v1/agent/:mint/timeline?limit=50
[
  {
    "type": "BUYBACK_EXECUTED",
    "occurredAt": "2026-04-24T16:42:11Z",
    "asset": "SOL",
    "amount": 2.1,
    "signature": "novax...Q",
    "slot": 298441222,
    "confidence": "high"
  }
]`,
  },
  {
    title: "x402 pay-per-call",
    body:
      "Machine clients call the endpoint with no auth. The first response is HTTP 402 with a payment quote. Pay the quoted USDC invoice on Solana, then re-request with the payment proof header.",
    code: `// First request
GET /v1/x402/agent/7xKQ92.../dossier
< 402 Payment Required
< x-spx-quote: 0.05 USDC
< x-spx-invoice: pdaABC...

// After paying:
GET /v1/x402/agent/7xKQ92.../dossier
  -H "x-spx-payment: <signature>"
< 200 OK`,
  },
  {
    title: "Webhooks",
    body: "Team plan delivers JSON payloads on event types you subscribe to. SPX402 retries with exponential backoff and idempotent IDs.",
    code: `POST <your-endpoint>
{
  "id": "evt_01HXYZ...",
  "agentMint": "7xKQ92...",
  "type": "BUYBACK_EXECUTED",
  "occurredAt": "2026-04-24T16:42:11Z",
  "data": { ... }
}`,
  },
  {
    title: "Rate limits",
    body: "Free: 60 req/hour per IP. Pro: 600 req/hour. Team: 1,000 req/day per key with burst tolerance. x402: gated by USDC payment per request.",
  },
];

function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">API · v1</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-paper">
        Endpoint reference.
      </h1>
      <p className="mt-5 max-w-2xl text-paper-muted">
        SPX402 exposes execution data over a REST API and an HTTP 402 pay-per-call
        layer. All endpoints return JSON. All times are UTC ISO 8601.
      </p>

      <div className="mt-12 space-y-8">
        {SECTIONS.map((s) => (
          <Panel key={s.title} eyebrow={s.title}>
            <p className="text-paper-muted">{s.body}</p>
            {s.code && (
              <pre className="mt-5 overflow-x-auto border border-bronze/50 bg-panel-deep p-4 font-mono text-[12px] leading-relaxed text-paper">
                {s.code}
              </pre>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
