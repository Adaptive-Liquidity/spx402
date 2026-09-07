import { createFileRoute } from "@tanstack/react-router";
import { StatusChip } from "@/components/spx/StatusChip";

export const Route = createFileRoute("/corrections")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/corrections" }],
    meta: [
      { title: "Corrections Policy — SPX402" },
      {
        name: "description",
        content:
          "How SPX402 corrects a wrong grade: dated, both grades shown, versions named, old attestations superseded rather than deleted.",
      },
      { property: "og:title", content: "Corrections Policy — SPX402" },
      {
        property: "og:description",
        content: "A reputation system that cannot admit error is not a reputation system.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://spx402.com/corrections" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CorrectionsPage,
});

const RULES = [
  ["Every correction is dated", "The date a grade was wrong and the date it was corrected are both published."],
  ["Both grades are shown", "The published grade and the corrected grade appear side by side. The wrong grade is never quietly removed."],
  ["Versions are named", "Each correction names the decoder version, scoring version, evidence-floor version and methodology version in force at the time."],
  ["Attestations are superseded, not deleted", "The original on-chain attestation stays. A new attestation is issued and references the one it supersedes."],
  ["Corrections stay public", "A correction remains on the record permanently and links to both attestations and to the evidence bundle."],
  ["Corrections protect trust", "Publishing an error is cheaper than hiding one. A grade you cannot audit is not a grade."],
];

function CorrectionsPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-12 lg:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight text-paper">
        Corrections Policy
      </h1>
      <p className="mt-5 text-lg text-paper-muted">
        SPX402 publishes grades from decoded on-chain evidence. Decoders change, evidence arrives
        late, and mistakes happen. When a grade was wrong, the record says so.
      </p>

      <div className="mt-10 space-y-px overflow-hidden border border-bronze/40 bg-bronze/40">
        {RULES.map(([title, body]) => (
          <div key={title} className="bg-panel px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-paper">{title}</h2>
            <p className="mt-1.5 text-sm text-paper-muted">{body}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Published corrections</h2>
        <div className="mt-4 border border-bronze/40 bg-panel p-8 text-center">
          <StatusChip status="unknown" />
          <p className="mt-3 font-mono text-sm text-paper-muted">
            No correction log has been returned yet. SPX402 does not display an example correction
            as though it were real.
          </p>
          <p className="mt-2 font-mono text-[11px] text-wire">
            Expected from the backend: <code className="text-paper">GET /api/corrections</code>
          </p>
        </div>
      </section>
    </div>
  );
}
