// Wave 4 — Iframe-friendly embed widget.
//
// Usage:
//   <iframe
//     src="https://spx402.com/embed/<MINT>?theme=dark&events=5"
//     width="380" height="320" frameborder="0"
//     loading="lazy" referrerpolicy="no-referrer">
//   </iframe>
//
// Renders a self-contained badge: grade, score, confidence chip,
// and the last N events. Loaded SSR via the route loader so embed
// consumers get a complete first paint with no client JS roundtrips.

import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchAgent } from "@/lib/agents-db";
import { fetchAgentEvents } from "@/lib/live-data";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import type { Agent } from "@/lib/agents";

export const Route = createFileRoute("/embed/$subject")({
  loader: async ({ params }) => {
    const subject = params.subject;
    const [agent, events] = await Promise.all([
      fetchAgent(subject).catch(() => null),
      fetchAgentEvents(subject, 5).catch(() => []),
    ]);
    return { subject, agent, events };
  },
  head: ({ loaderData }) => {
    const sym = loaderData?.agent?.symbol ?? "AGENT";
    return {
      meta: [
        { title: `${sym} — SPX402 reputation embed` },
        { name: "robots", content: "noindex" },
        { name: "referrer", content: "no-referrer" },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <EmbedShell>
      <div className="text-xs text-critical">
        Failed to load: {error.message}
      </div>
    </EmbedShell>
  ),
  notFoundComponent: () => (
    <EmbedShell>
      <div className="text-xs text-critical">SPX404 — subject not found</div>
    </EmbedShell>
  ),
  component: EmbedSubject,
});

function EmbedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background p-3 font-mono text-paper">
      <div className="mx-auto max-w-[380px] border border-bronze/60 bg-panel-deep/80 p-4">
        {children}
        <div className="mt-3 flex items-center justify-between border-t border-bronze/40 pt-2 text-[9px] uppercase tracking-widest text-paper-muted">
          <span>spx402 · on-chain reputation</span>
          <a
            href="https://spx402.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber hover:underline"
          >
            spx402.com
          </a>
        </div>
      </div>
    </div>
  );
}

function EmbedSubject() {
  const { subject, agent, events } = Route.useLoaderData() as {
    subject: string;
    agent: Agent | null;
    events: Array<{
      id: string;
      type: string;
      severity: string;
      occurredAt: string;
      amountSol: number;
    }>;
  };

  if (!agent) {
    return (
      <EmbedShell>
        <div className="space-y-2">
          <ExecutionGradeBadge grade="SPX404" size="md" />
          <div className="text-xs text-paper-muted">
            <code className="break-all">{subject}</code> is not yet verified by
            SPX402.
          </div>
          <Link
            to="/submit"
            className="inline-block text-[10px] uppercase tracking-widest text-amber hover:underline"
          >
            Submit for review →
          </Link>
        </div>
      </EmbedShell>
    );
  }

  const confidence = Number(agent.confidenceScore ?? 0);

  return (
    <EmbedShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-widest text-paper-muted">
            ${agent.symbol}
          </div>
          <div className="mt-0.5 truncate text-sm font-bold text-paper">
            {agent.name}
          </div>
          <div className="mt-2">
            <ExecutionGradeBadge
              grade={agent.grade}
              confidenceScore={confidence}
              size="sm"
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-widest text-paper-muted">
            score
          </div>
          <div className="num-display text-3xl font-bold leading-none text-amber">
            {agent.score ?? "—"}
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-widest text-paper-muted">
            conf {(confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-bronze/40 pt-2">
        <div className="text-[9px] uppercase tracking-widest text-paper-muted">
          Last 5 events
        </div>
        <ul className="mt-1.5 space-y-1">
          {events.length === 0 && (
            <li className="text-[10px] text-paper-muted">
              No events observed yet.
            </li>
          )}
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-baseline justify-between gap-2 text-[10px]"
            >
              <span
                className={`truncate uppercase tracking-wider ${severityColor(e.severity)}`}
              >
                {e.type.replace(/_/g, " ")}
              </span>
              <span className="text-paper-muted">
                {e.amountSol > 0 ? `${e.amountSol.toFixed(3)} SOL` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <a
        href={`https://spx402.com/agent/${agent.mint}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-[10px] uppercase tracking-widest text-amber hover:underline"
      >
        See full dossier →
      </a>
    </EmbedShell>
  );
}

function severityColor(s: string): string {
  if (s === "success") return "text-verified";
  if (s === "critical") return "text-critical";
  if (s === "warn") return "text-amber-dim";
  return "text-paper";
}
