import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "API — Execution data for agents · SPX402" },
      { name: "description", content: "REST + x402 pay-per-call APIs for tokenized agent execution data." },
      { property: "og:title", content: "SPX402 API" },
      { property: "og:description", content: "Designed for human analysts. Priced for machine buyers." },
    ],
  }),
  component: ApiPage,
});

const USE_CASES = [
  "Check whether an agent is active before routing work to it.",
  "Verify buyback and burn execution before publishing a holding.",
  "Monitor a portfolio of tokenized agents.",
  "Embed an SPX402 badge into an agent page.",
  "Screen stale or suspicious execution patterns.",
  "Build downstream analytics on top of decoded events.",
];

const ENDPOINTS = [
  ["GET", "/v1/agent/:mint", "Full dossier"],
  ["GET", "/v1/agent/:mint/score", "Transparency Score + grade"],
  ["GET", "/v1/agent/:mint/timeline", "Decoded event timeline"],
  ["GET", "/v1/agent/:mint/buybacks", "Buyback executions"],
  ["GET", "/v1/agent/:mint/burns", "Confirmed burns"],
  ["GET", "/v1/agent/:mint/config", "Operator config + change history"],
  ["GET", "/v1/agent/:mint/anomalies", "Open anomalies"],
  ["GET", "/v1/agent/:mint/og-card", "Shareable PNG card"],
] as const;

function ApiPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">API</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        Execution data for agents,<br />
        <span className="text-amber">funds, launchpads, and other machines.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-paper-muted">
        Two transports. Same data. Use the REST API with a key for sustained
        workloads. Use the x402 endpoints for instant pay-per-call from machine
        clients with no account.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/api/docs" className="border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep">
          Open Endpoints →
        </Link>
        <Link to="/pricing" className="border border-bronze/70 px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber">
          Pricing
        </Link>
      </div>

      {/* USE CASES */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">Use cases</h2>
        <ul className="mt-6 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-2">
          {USE_CASES.map((u) => (
            <li key={u} className="bg-panel p-5 text-sm text-paper">
              <span className="mr-2 text-amber">▸</span>
              {u}
            </li>
          ))}
        </ul>
      </section>

      {/* ENDPOINTS */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">Core endpoints</h2>
        <div className="mt-6 overflow-hidden border border-bronze/50 font-mono text-sm">
          {ENDPOINTS.map(([method, path, desc], i) => (
            <div
              key={path}
              className={`grid grid-cols-12 items-center gap-4 px-5 py-3 ${i % 2 ? "bg-panel" : "bg-background"}`}
            >
              <div className="col-span-2 text-amber">{method}</div>
              <div className="col-span-6 text-paper">{path}</div>
              <div className="col-span-4 text-paper-muted">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RESPONSE */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">Sample response</h2>
        <div className="mt-6 panel-engraved overflow-hidden">
          <div className="flex items-center justify-between border-b border-bronze/50 bg-panel-deep/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest">
            <span className="text-amber">GET</span>
            <span className="text-wire">api.spx402.xyz/v1/agent/7xK...Q92</span>
            <span className="text-verified">200 OK</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-paper">
{`{
  "mint": "7xKQ92pLm4nBvR8sT3jYwZcA1pXqFhNeUgD5sM2QnK7p",
  "symbol": "NOVA",
  "name": "Agent Nova",
  "grade": "SPX AA",
  "transparencyScore": 87,
  "operatorVerified": true,
  "status": "active",
  "confidence": "high",
  "stats": {
    "totalDeposits": 847,
    "totalBuybacks": 842,
    "totalBurns": 842,
    "failedWindows": 5,
    "buybackExecutionRate": 0.964,
    "burnConfirmationRate": 1.0
  },
  "lastBuybackAt": "2026-04-24T16:42:11Z",
  "lastBurnAt": "2026-04-24T16:42:11Z",
  "parserVersion": "v0.1.7",
  "indexedAt": "2026-04-24T16:56:25Z"
}`}
          </pre>
        </div>
      </section>

      {/* CALLOUT */}
      <section className="mt-16 panel-engraved p-7 text-center">
        <h2 className="font-display text-3xl font-bold text-paper">
          Designed for human analysts.<br />
          <span className="text-amber">Priced for machine buyers.</span>
          <br />Auditable by anyone.
        </h2>
      </section>
    </div>
  );
}
