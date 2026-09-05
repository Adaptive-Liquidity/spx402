import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — SPX402" },
      {
        name: "description",
        content: "Free to verify. Paid to monitor. Priced for operators with something to lose.",
      },
      { property: "og:title", content: "SPX402 Pricing" },
      {
        property: "og:description",
        content: "Free dossiers. Pro alerts. Team API. x402 pay-per-call.",
      },
    ],
  }),
  component: PricingPage,
});

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "always",
    body: "For curious holders and one-time checks.",
    cta: "Start free",
    href: "/signup" as const,
    features: [
      "Unlimited public dossier views",
      "30-day event history",
      "Transparency Score",
      "Recent event timeline",
      "Shareable agent card",
      "1 alert destination",
      "1 operator verification",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    cadence: "/month",
    body: "For serious holders, operators, and communities.",
    cta: "Upgrade to Pro",
    href: "/signup" as const,
    highlighted: true,
    features: [
      "Unlimited watchlist",
      "Realtime webhook + Slack alerts",
      "Full event history",
      "CSV export",
      "Unlimited operator verification",
      "Verified badge",
      "Private operator dashboard",
      "Priority support",
    ],
  },
  {
    name: "Team",
    price: "$149",
    cadence: "/month",
    body: "For protocols, funds, and multi-agent operators.",
    cta: "Contact team",
    href: "/signup" as const,
    features: [
      "Everything in Pro",
      "REST API access",
      "10,000 calls / day",
      "Webhook delivery",
      "Bulk agent import",
      "Multi-wallet operator management",
      "Raw event export",
      "Dedicated Slack channel",
      "Alert SLA target",
    ],
  },
  {
    name: "x402 API",
    price: "per call",
    cadence: "USDC",
    body: "For agents querying other agents.",
    cta: "Read API docs",
    href: "/api/docs" as const,
    features: [
      "HTTP 402 pay-per-request",
      "Score endpoint — 0.01 USDC",
      "Timeline endpoint — 0.02 USDC",
      "Full dossier — 0.05 USDC",
      "No accounts required",
      "Settled on-chain",
    ],
  },
] as const;

const COMPARE_ROWS = [
  ["Public dossier views", true, true, true, true],
  ["Event history", "30 days", "Full", "Full", "Full"],
  ["Realtime alerts", "1 destination", "Webhook + Slack", "Webhook + Slack, unlimited", false],
  ["CSV export", false, true, true, false],
  ["Operator verification", "1", "Unlimited", "Unlimited", false],
  ["REST API", false, false, "1,000 / day", "Per call"],
  ["Webhook delivery", false, false, true, false],
  ["x402 endpoints", false, false, false, true],
] as const;

const FAQ = [
  {
    q: "Does paying SPX402 improve my score?",
    a: "No. The Transparency Score is computed from on-chain execution data only. Subscriptions buy access to monitoring tools and data features — they do not buy investment recommendations, token returns, or preferential scoring.",
  },
  {
    q: "Why is there a pay-per-call API?",
    a: "Agents will not browse dashboards. Agents will query other agents. The x402 API lets machine clients pay for a single response over HTTP without accounts or API key management. Settlement is always caller-funded — SPX402 sponsors no gas and runs no paymaster; callers and agents bring their own USDC and execution fees.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Subscriptions cancel immediately and access continues until the end of the billing period.",
  },
  {
    q: "Do operators get free verification?",
    a: "Operator wallet verification itself is free. Pro subscribers can verify unlimited agents under one account.",
  },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-verified" />;
  if (v === false) return <X className="mx-auto h-4 w-4 text-wire" />;
  return <span className="font-mono text-xs text-paper">{v}</span>;
}

function PricingPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="text-center">
        <div className="label-amber">Pricing</div>
        <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper sm:text-6xl">
          Free to verify.
          <br />
          <span className="text-amber">Paid to monitor.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-paper-muted">
          Public dossiers stay free forever. Operators, researchers, funds, and machine clients pay
          for monitoring, history, alerts, and API access.
        </p>
      </div>

      <div className="mt-14 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`flex flex-col bg-background p-7 ${"highlighted" in t && t.highlighted ? "ring-1 ring-amber" : ""}`}
          >
            <div className="flex items-baseline justify-between">
              <div className="label-amber">{t.name}</div>
              {"highlighted" in t && t.highlighted && (
                <span className="border border-amber/80 bg-amber/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber">
                  Recommended
                </span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="num-display text-4xl font-bold text-paper">{t.price}</span>
              <span className="font-mono text-xs uppercase tracking-widest text-wire">
                {t.cadence}
              </span>
            </div>
            <p className="mt-3 text-sm text-paper-muted">{t.body}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
                  <span className="text-paper">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to={t.href}
              className={`mt-7 inline-flex items-center justify-center border px-4 py-3 font-mono text-[11px] uppercase tracking-widest ${
                "highlighted" in t && t.highlighted
                  ? "border-amber bg-amber text-panel-deep hover:bg-amber-dim"
                  : "border-amber/80 bg-amber/10 text-amber hover:bg-amber hover:text-panel-deep"
              }`}
            >
              {t.cta} →
            </Link>
          </div>
        ))}
      </div>

      {/* WARNING */}
      <div className="mt-10 border-l-2 border-bronze bg-panel-deep/60 p-5">
        <p className="text-sm leading-relaxed text-paper-muted">
          <span className="font-mono uppercase tracking-widest text-amber">Note</span> —
          Subscriptions buy access to monitoring tools and data features. They do not buy investment
          recommendations, token returns, or preferential scoring.
        </p>
      </div>

      {/* COMPARE */}
      <section className="mt-20">
        <div className="label-amber">Compare</div>
        <h2 className="mt-3 font-display text-3xl font-bold text-paper">Feature comparison</h2>
        <div className="mt-6 overflow-x-auto border border-bronze/50">
          <table className="w-full font-mono text-xs">
            <thead className="bg-panel-deep">
              <tr className="text-left uppercase tracking-widest text-wire">
                <th className="px-4 py-3 text-[10px]">Feature</th>
                <th className="px-4 py-3 text-center text-[10px]">Free</th>
                <th className="px-4 py-3 text-center text-[10px] text-amber">Pro</th>
                <th className="px-4 py-3 text-center text-[10px]">Team</th>
                <th className="px-4 py-3 text-center text-[10px]">x402 API</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => (
                <tr key={i} className="border-t border-bronze/30">
                  <td className="px-4 py-3 text-paper">{row[0] as string}</td>
                  <td className="px-4 py-3 text-center">
                    <Cell v={row[1] as boolean | string} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell v={row[2] as boolean | string} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell v={row[3] as boolean | string} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell v={row[4] as boolean | string} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-20">
        <div className="label-amber">FAQ</div>
        <h2 className="mt-3 font-display text-3xl font-bold text-paper">Common questions</h2>
        <div className="mt-8 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="bg-panel p-6">
              <h3 className="font-display text-lg font-semibold text-paper">{f.q}</h3>
              <p className="mt-3 text-sm leading-relaxed text-paper-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
