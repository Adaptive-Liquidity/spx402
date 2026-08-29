import { FileQuestion, Banknote, ShieldCheck, PackageCheck, Award } from "lucide-react";

const X402_STEPS = [
  {
    icon: FileQuestion,
    title: "Challenge issued",
    body: "The endpoint answers with HTTP 402 and a payment requirement: asset, amount, payTo.",
    code: "PAYMENT_REQUIRED",
  },
  {
    icon: Banknote,
    title: "Payment settled",
    body: "A buyer pays on Solana or Base. SPX402 reads the settlement, not the invoice.",
    code: "X402_PAYMENT_RECEIVED",
  },
  {
    icon: ShieldCheck,
    title: "Facilitator confirmed",
    body: "The fee-payer is matched against the public facilitator registry. No match, no high confidence.",
    code: "FACILITATOR_MATCH",
  },
  {
    icon: PackageCheck,
    title: "Delivery probed",
    body: "SPX402 buys from the endpoint itself and records whether anything arrived.",
    code: "PROBE_DELIVERED",
  },
  {
    icon: Award,
    title: "Grade assigned",
    body: "Counterparty-weighted execution becomes a public score. Probe data is shown, not scored.",
    code: "GRADE_PUBLISHED",
  },
];

/** The x402 settlement chain, engraved in the same language as the buyback chain. */
export function ProofChainX402() {
  return (
    <ol className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2 lg:grid-cols-5">
      {X402_STEPS.map((s, i) => (
        <li key={s.title} className="relative bg-panel p-6">
          <div className="flex items-start justify-between">
            <s.icon className="h-6 w-6 text-amber" aria-hidden />
            <span className="font-mono text-[10px] tracking-widest text-wire">0{i + 1}</span>
          </div>
          <h3 className="mt-5 font-display text-lg font-semibold text-paper">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-paper-muted">{s.body}</p>
          <div className="mt-4 inline-block border border-bronze/60 bg-panel-deep px-2 py-1 font-mono text-[10px] tracking-widest text-amber">
            {s.code}
          </div>
        </li>
      ))}
    </ol>
  );
}
