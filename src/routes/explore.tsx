import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AgentRow } from "@/components/spx/AgentRow";
import { AgentSearchBar } from "@/components/spx/AgentSearchBar";
import { fetchAllAgents } from "@/lib/agents-db";
import type { Agent } from "@/lib/agents";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Agents — SPX402" },
      {
        name: "description",
        content: "Browse tokenized agents by execution consistency, recent verification, stale activity, and SPX404 archive.",
      },
      { property: "og:title", content: "Explore tokenized agents — SPX402" },
      { property: "og:description", content: "Filter by observable execution. Not by vibes." },
    ],
  }),
  loader: () => fetchAllAgents(),
  staleTime: 30_000,
  pendingComponent: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-20 text-center font-mono text-xs uppercase tracking-widest text-wire">
      Loading agent index…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-[1400px] px-4 py-20 text-center">
      <div className="label-amber">Index unavailable</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
    </div>
  ),
  component: ExplorePage,
});

const SECTIONS: Array<{
  title: string;
  eyebrow: string;
  body: string;
  filter: (a: Agent) => boolean;
}> = [
  {
    eyebrow: "High-confidence dossiers",
    title: "Most consistent execution",
    body: "Agents with high buyback execution rate and active operator verification.",
    filter: (a) => (a.score ?? 0) >= 80,
  },
  {
    eyebrow: "Live activity",
    title: "Recently analyzed",
    body: "Most recently reconciled agents in the SPX402 index.",
    filter: () => true,
  },
  {
    eyebrow: "Watch closely",
    title: "Recently degraded",
    body: "Execution patterns that have lost rhythm. The tape has developed a limp.",
    filter: (a) => a.grade === "SPX BB" || a.grade === "SPX B" || a.grade === "SPX BBB",
  },
  {
    eyebrow: "SPX404 archive",
    title: "Insufficient evidence",
    body: "Agents not found, inactive, or lacking enough verifiable execution to grade.",
    filter: (a) => a.grade === "SPX404",
  },
];

function ExplorePage() {
  const agents = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <div className="label-amber">Explorer</div>
          <h1 className="mt-3 font-display text-5xl font-bold text-paper">
            The full ledger of every agent we have heard.
          </h1>
          <p className="mt-4 max-w-xl text-paper-muted">
            Agents are not ranked by hype, holders, or sentiment. SPX402 sorts by
            observable execution patterns and time since last successful settlement.
          </p>
        </div>
        <div className="lg:col-span-5">
          <AgentSearchBar />
        </div>
      </div>

      {SECTIONS.map((section, i) => {
        const list = agents.filter(section.filter);
        return (
          <section key={section.title} className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="label-amber">{section.eyebrow}</div>
                <h2 className="mt-2 font-display text-2xl font-bold text-paper">
                  {section.title}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-paper-muted">{section.body}</p>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-wire">
                {list.length} agents
              </span>
            </div>
            <div className="mt-6 space-y-2">
              {list.length === 0 ? (
                <div className="border border-dashed border-bronze/60 p-8 text-center font-mono text-sm text-paper-muted">
                  No agents match this filter in the index.
                </div>
              ) : (
                list.map((a) => <AgentRow key={a.mint} agent={a} />)
              )}
            </div>
            {i < SECTIONS.length - 1 && <div className="mt-10 rule-bronze" />}
          </section>
        );
      })}

      <div className="mt-20 panel-engraved p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-paper">
          Don&apos;t see your agent?
        </h2>
        <p className="mt-3 text-paper-muted">
          Paste a mint, creator wallet, or Agent Deposit Address and SPX402 will queue
          it for analysis.
        </p>
        <div className="mx-auto mt-6 max-w-xl">
          <AgentSearchBar />
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-wire">
          <Link to="/" className="text-amber hover:underline">Return to terminal</Link>
        </p>
      </div>
    </div>
  );
}
