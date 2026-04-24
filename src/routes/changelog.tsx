import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — SPX402" },
      { name: "description", content: "Product and methodology updates." },
    ],
  }),
  component: ChangelogPage,
});

const ENTRIES = [
  {
    v: "v0.1.7",
    d: "Apr 24, 2026",
    type: "parser",
    items: [
      "Added buyback_bps config diffing — emits CONFIG_CHANGED events with previous/next values.",
      "Improved SPL burn matching across multi-slot sequences.",
      "Fixed false-positive FAILED_WINDOW under high RPC latency.",
    ],
  },
  {
    v: "v0.1.6",
    d: "Apr 18, 2026",
    type: "product",
    items: [
      "Added SPX404 archive view in /explore.",
      "Operator badges now expose JSON-LD metadata for embedding.",
      "Pricing page redesign.",
    ],
  },
  {
    v: "v0.1.5",
    d: "Apr 9, 2026",
    type: "methodology",
    items: [
      "Removed token price from Transparency Score (was previously reserved 0%, now formally documented).",
      "Recency weight increased from 8% to 10%.",
      "Operator verification weight introduced at 5%.",
    ],
  },
  {
    v: "v0.1.4",
    d: "Apr 2, 2026",
    type: "product",
    items: [
      "x402 pay-per-call API entered private beta.",
      "Webhook delivery added to Team plan with idempotent retries.",
    ],
  },
];

const TYPE_COLORS: Record<string, string> = {
  parser: "text-amber border-amber/70",
  product: "text-verified border-verified/70",
  methodology: "text-paper border-paper/70",
};

function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8 lg:py-24">
      <div className="label-amber">Changelog</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-paper">
        Every parser version, on the record.
      </h1>
      <p className="mt-4 text-paper-muted">
        Every methodology change is timestamped. Old scores can be replayed against
        the parser version that produced them.
      </p>

      <ol className="mt-12 space-y-12">
        {ENTRIES.map((e) => (
          <li key={e.v}>
            <div className="flex items-center gap-3">
              <span className="num-display text-3xl font-bold text-paper">{e.v}</span>
              <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${TYPE_COLORS[e.type]}`}>
                {e.type}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-wire">{e.d}</span>
            </div>
            <ul className="mt-4 space-y-2 text-paper-muted">
              {e.items.map((it) => (
                <li key={it} className="border-l-2 border-bronze pl-4 text-sm">
                  {it}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
