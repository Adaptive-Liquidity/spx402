// Tier 3 — public attestation verification view.
//
// Anyone holding a badge, a share card, or an evidence bundle can land here
// and read the on-chain attestations SPX402 has issued for that subject:
// UID, kind, grade, score, attester, transaction. Every row links to Base.
// Built from existing primitives only (PageHeader, DataTable, stage width).

import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/spx/PageHeader";
import { DataTable, type Column } from "@/components/spx/DataTable";
import { EmptyState } from "@/components/spx/EmptyState";
import { listAttestations } from "@/lib/badge.functions";

type AttestationRow = {
  attestation_uid: string;
  kind: string;
  grade: string | null;
  score: number | null;
  tx_hash: string | null;
  attester: string;
  created_at: string;
};

export const Route = createFileRoute("/verify/$subject")({
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: `https://spx402.com/verify/${params.subject}` }],
    meta: [
      { title: `Verify attestations — ${short(params.subject)} — SPX402` },
      {
        name: "description",
        content:
          "On-chain attestations issued by SPX402 for this subject: UID, grade, score, attester and settlement transaction.",
      },
      { property: "og:title", content: `Verify attestations — ${short(params.subject)} — SPX402` },
      {
        property: "og:description",
        content: "Every SPX402 badge is backed by an on-chain attestation. Check it here.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ params }) => {
    try {
      return (await listAttestations({ data: { mint: params.subject } })) as AttestationRow[];
    } catch {
      return [] as AttestationRow[];
    }
  },
  staleTime: 30_000,
  errorComponent: ({ error }) => (
    <div className="stage section text-center">
      <div className="label-amber">Verification unavailable</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
    </div>
  ),
  component: VerifyPage,
});

function short(v: string) {
  return v.length > 12 ? `${v.slice(0, 4)}…${v.slice(-4)}` : v;
}

function fmtUtc(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return `${new Date(t).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

const BASESCAN = "https://basescan.org";

function VerifyPage() {
  const rows = Route.useLoaderData() as AttestationRow[];
  const { subject } = Route.useParams();

  const columns: Array<Column<AttestationRow>> = [
    {
      key: "uid",
      header: "Attestation UID",
      cell: (r) => (
        <a
          href={`https://base.easscan.org/attestation/view/${r.attestation_uid}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-amber hover:underline"
        >
          {short(r.attestation_uid)}
          <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    { key: "kind", header: "Kind", cell: (r) => <span className="font-mono text-xs">{r.kind}</span> },
    {
      key: "grade",
      header: "Grade",
      cell: (r) => <span className="font-mono text-xs">{r.grade ?? "—"}</span>,
    },
    {
      key: "score",
      header: "Score",
      align: "right",
      cell: (r) => <span className="font-mono text-xs">{r.score ?? "—"}</span>,
    },
    {
      key: "attester",
      header: "Attester",
      hideBelow: "md",
      cell: (r) => <span className="font-mono text-xs">{short(r.attester)}</span>,
    },
    {
      key: "tx",
      header: "Transaction",
      hideBelow: "sm",
      cell: (r) =>
        r.tx_hash ? (
          <a
            href={`${BASESCAN}/tx/${r.tx_hash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-amber hover:underline"
          >
            {short(r.tx_hash)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="font-mono text-xs text-wire">—</span>
        ),
    },
    {
      key: "created",
      header: "Issued",
      align: "right",
      hideBelow: "lg",
      cell: (r) => <span className="font-mono text-xs">{fmtUtc(r.created_at)}</span>,
    },
  ];

  return (
    <div className="stage section">
      <PageHeader
        eyebrow="Verification"
        title="Attestation record"
        standfirst="Every SPX402 badge is backed by an attestation written on Base. This page lists what was signed, when, and by whom."
        meta={[
          { label: "Subject", value: <span className="font-mono">{short(subject)}</span> },
          { label: "Attestations", value: <span className="font-mono">{rows.length}</span> },
        ]}
        actions={
          <Link
            to="/agent/$mint"
            params={{ mint: subject }}
            className="font-mono text-[10px] uppercase tracking-widest text-amber hover:underline"
          >
            Open dossier →
          </Link>
        }
      />

      <div className="mt-8">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.attestation_uid}
          caption="On-chain attestations issued for this subject"
          empty={
            <EmptyState
              label="Attestations"
              title="No attestations issued"
              body="SPX402 has not written an on-chain attestation for this subject yet. The grade on the dossier is still derived from indexed receipts."
            />
          }
        />
      </div>
    </div>
  );
}
