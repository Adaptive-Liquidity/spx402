import { createFileRoute } from "@tanstack/react-router";
import { StatusChip } from "@/components/spx/StatusChip";

export const Route = createFileRoute("/genesis-record")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/genesis-record" }],
    meta: [
      { title: "Genesis Record — SPX402" },
      {
        name: "description",
        content:
          "The signed launch record for SPX402: subject identities, attester key, disclosures, corrections commitment and evidence-floor commitment.",
      },
      { property: "og:title", content: "Genesis Record — SPX402" },
      {
        property: "og:description",
        content: "The founding disclosures of a reputation system, signed and public.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://spx402.com/genesis-record" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GenesisPage,
});

const FIELDS = [
  "Launch claim",
  "AEON / SPX402 public release status",
  "Subject identities",
  "Signature",
  "Public key",
  "Attester key",
  "Operational relationship",
  "Financial / token relationship",
  "Trading policy",
  "AEON operator disclosure",
  "AEON upgrade authority disclosure",
  "Corrections commitment",
  "Evidence floor commitment",
];

function GenesisPage() {
  return (
    <div className="stage-narrow py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight text-paper">Genesis Record</h1>
      <p className="mt-5 text-lg text-paper-muted">
        The founding disclosures of SPX402, signed by the attester key. A reputation system should
        start by disclosing its own relationships before it grades anyone else&apos;s.
      </p>

      <div className="mt-8 border-l-2 border-amber/70 bg-amber/5 px-4 py-3 font-mono text-sm text-amber">
        Waiting for signed Genesis Record. SPX402 will not display an unsigned record as though it
        were signed.
      </div>

      <dl className="mt-8 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
        {FIELDS.map((label) => (
          <div key={label} className="bg-panel px-4 py-3">
            <dt className="label-mono">{label}</dt>
            <dd className="mt-1">
              <StatusChip status="unknown" />
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 font-mono text-[11px] text-wire">
        Expected from the backend: <code className="text-paper">GET /api/genesis-record</code>. Only
        published, public subjects ever appear in this record.
      </p>
    </div>
  );
}
