import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { TransparencyScoreRing } from "@/components/spx/TransparencyScoreRing";
import { MetricCard } from "@/components/spx/MetricCard";
import { Panel } from "@/components/spx/Panel";
import { type Agent } from "@/lib/agents";
import { fetchAgent } from "@/lib/agents-db";
import { addToWatchlist, isOnWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import { useAuth } from "@/lib/auth";
import {
  ShieldCheck, ShieldOff, Copy, Share2, AlertTriangle, CheckCircle2, ArrowDownToLine, Repeat, Flame, Settings, Activity, Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/agent/$mint")({
  head: ({ loaderData }: { loaderData?: { agent: Agent } }) => {
    const a = loaderData?.agent;
    if (!a) {
      return {
        meta: [
          { title: "Agent dossier · SPX402" },
          { name: "description", content: "Tokenized agent dossier." },
        ],
      };
    }
    return {
      meta: [
        { title: `$${a.symbol} — ${a.grade} · SPX402` },
        {
          name: "description",
          content: `${a.name}: Transparency Score ${a.score ?? "n/a"}. ${a.totalBuybacksCount} buybacks confirmed. ${a.verdict}`,
        },
        { property: "og:title", content: `$${a.symbol} — ${a.grade} on SPX402` },
        { property: "og:description", content: a.verdict },
      ],
    };
  },
  loader: async ({ params }) => {
    const agent = await fetchAgent(params.mint);
    if (!agent) throw notFound();
    return { agent };
  },
  staleTime: 30_000,
  component: AgentDossierPage,
  notFoundComponent: () => <NotFound mint="" />,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="label-amber">Dossier error</div>
        <p className="mt-3 text-paper-muted">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          Retry
        </button>
      </div>
    );
  },
});

function NotFound({ mint }: { mint: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <div className="inline-flex items-center gap-2 border border-critical/70 bg-critical/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-critical flicker-404">
        SPX404
      </div>
      <h1 className="mt-8 font-display text-5xl font-bold text-paper">
        Agent not found.
      </h1>
      <p className="mt-4 font-mono text-sm text-paper-muted">
        Agent not found, inactive, or lacking enough evidence for a grade.
        We do not grade ghosts without receipts.
      </p>
      {mint && (
        <p className="mt-2 font-mono text-xs text-wire">QUERY: {mint}</p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep">
          New search
        </Link>
        <Link to="/explore" className="border border-bronze/70 px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:text-paper">
          Explore agents
        </Link>
      </div>
    </div>
  );
}

const EVENT_ICON = {
  DEPOSIT_RECEIVED: ArrowDownToLine,
  BUYBACK_EXECUTED: Repeat,
  BURN_CONFIRMED: Flame,
  CONFIG_CHANGED: Settings,
  FAILED_WINDOW: AlertTriangle,
  ANOMALY_DETECTED: AlertTriangle,
  OPERATOR_VERIFIED: ShieldCheck,
} as const;

function shortMint(m: string) {
  return `${m.slice(0, 6)}…${m.slice(-6)}`;
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="inline-flex items-center gap-1.5 border border-bronze/60 bg-panel-deep/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
    >
      {done ? <CheckCircle2 className="h-3 w-3 text-verified" /> : <Copy className="h-3 w-3" />}
      {label ?? (done ? "Copied" : "Copy")}
    </button>
  );
}

function AgentDossierPage() {
  const data = Route.useLoaderData() as { agent: Agent };
  return <Dossier agent={data.agent} />;
}

function Dossier({ agent }: { agent: Agent }) {
  const [filter, setFilter] = useState<"all" | "buyback" | "burn" | "deposit" | "anomaly" | "config">("all");
  const filtered = agent.events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "buyback") return e.type === "BUYBACK_EXECUTED";
    if (filter === "burn") return e.type === "BURN_CONFIRMED";
    if (filter === "deposit") return e.type === "DEPOSIT_RECEIVED";
    if (filter === "anomaly") return e.type === "ANOMALY_DETECTED" || e.type === "FAILED_WINDOW";
    if (filter === "config") return e.type === "CONFIG_CHANGED";
    return true;
  });

  const isSPX404 = agent.grade === "SPX404";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8 lg:py-14">
      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-bronze/50 bg-panel-deep/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-wire">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span><span className="text-amber">SPX402</span> / AGENT DOSSIER / SOLANA MAINNET</span>
          <span>PARSER {agent.parserVersion}</span>
          <span>LAST INDEXED {agent.lastIndexedSeconds}s AGO</span>
          <span>CONFIDENCE <span className={agent.confidence === "high" ? "text-verified" : agent.confidence === "medium" ? "text-amber" : "text-critical"}>{agent.confidence.toUpperCase()}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber pulse-amber" />
          DEMO DATA
        </div>
      </div>

      {/* HERO PANEL */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="panel-engraved relative lg:col-span-8 p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="label-amber">Tokenized Agent {isSPX404 ? "· not found" : "confirmed"}</div>
              <h1 className="mt-3 font-display text-5xl font-bold text-paper">
                ${agent.symbol}
              </h1>
              <div className="mt-1 text-lg text-paper-muted">{agent.name}</div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-wire">MINT</span>
                <span className="font-mono text-xs text-paper">{shortMint(agent.mint)}</span>
                <CopyButton value={agent.mint} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <ExecutionGradeBadge grade={agent.grade} size="lg" />
              {agent.operatorVerified ? (
                <span className="inline-flex items-center gap-1.5 border border-verified/70 bg-verified/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-verified">
                  <ShieldCheck className="h-3 w-3" /> Operator Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 border border-wire/70 bg-panel-deep/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted">
                  <ShieldOff className="h-3 w-3" /> Operator Unverified
                </span>
              )}
            </div>
          </div>
          <div className="mt-8 rule-amber" />
          <p className="mt-6 max-w-2xl text-paper">{agent.verdict}</p>
          <div className="mt-4 border-l-2 border-amber/60 pl-3 font-mono text-sm italic text-paper-muted">
            “{agent.tagline}”
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <WatchlistButton mint={agent.mint} symbol={agent.symbol} />
            <button className="inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber">
              <Share2 className="h-3.5 w-3.5" /> Share dossier
            </button>
            <Link to="/alerts" className="inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber">
              Set alert
            </Link>
          </div>
        </div>

        <Panel className="lg:col-span-4" eyebrow="Transparency Score" title="Score breakdown">
          <div className="flex flex-col items-center">
            <TransparencyScoreRing score={agent.score} />
          </div>
          <div className="mt-6 space-y-2">
            {[
              { l: "Deposit consistency", v: agent.scoreBreakdown.depositConsistency, m: 20 },
              { l: "Buyback execution", v: agent.scoreBreakdown.buybackExecution, m: 25 },
              { l: "Burn confirmation", v: agent.scoreBreakdown.burnConfirmation, m: 20 },
              { l: "Failed tx (inverse)", v: agent.scoreBreakdown.failedTx, m: 15 },
              { l: "Recency", v: agent.scoreBreakdown.recency, m: 10 },
              { l: "Metadata", v: agent.scoreBreakdown.metadata, m: 5 },
              { l: "Operator verification", v: agent.scoreBreakdown.operator, m: 5 },
            ].map((row) => {
              const pct = row.m === 0 ? 0 : (row.v / row.m) * 100;
              return (
                <div key={row.l}>
                  <div className="flex justify-between font-mono text-[11px] uppercase tracking-wider">
                    <span className="text-paper-muted">{row.l}</span>
                    <span className="text-paper">{row.v} / {row.m}</span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-bronze-dim/60">
                    <div className="h-full bg-amber" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* METRIC CARDS */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total Deposits" value={agent.totalDepositsCount.toLocaleString()} />
        <MetricCard label="Buybacks Confirmed" value={agent.totalBuybacksCount.toLocaleString()} tone="verified" />
        <MetricCard label="Burns Confirmed" value={agent.totalBurnsCount.toLocaleString()} tone="verified" />
        <MetricCard label="Failed Windows" value={agent.failedWindows.toString()} tone={agent.failedWindows > 10 ? "critical" : "amber"} />
        <MetricCard label="Buyback Rate" value={`${(agent.buybackExecutionRate * 100).toFixed(1)}`} suffix="%" />
        <MetricCard label="Burn Confirm Rate" value={`${(agent.burnConfirmationRate * 100).toFixed(1)}`} suffix="%" />
      </div>

      {/* SECONDARY STATS */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8" eyebrow="Proof Timeline" title="On-chain execution log"
          right={
            <div className="flex flex-wrap gap-1">
              {(["all","buyback","burn","deposit","anomaly","config"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
                    filter === f
                      ? "border-amber bg-amber/15 text-amber"
                      : "border-bronze/60 text-paper-muted hover:text-paper"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        >
          {filtered.length === 0 ? (
            <div className="border border-dashed border-bronze/60 bg-panel-deep/40 p-10 text-center">
              <div className="font-mono text-sm text-paper-muted">
                No verifiable execution detected.
              </div>
              <div className="mt-2 font-mono text-xs text-wire">
                This may mean the agent is new, inactive, misconfigured, or not routing
                activity on-chain. SPX402 only rates what it can prove.
              </div>
            </div>
          ) : (
            <ol className="relative">
              <div className="absolute bottom-0 left-[15px] top-0 w-px bg-bronze/40" aria-hidden />
              {filtered.map((e) => {
                const Icon = EVENT_ICON[e.type] ?? Activity;
                const color =
                  e.severity === "success"
                    ? "text-verified border-verified/60"
                    : e.severity === "warn"
                      ? "text-amber border-amber/60"
                      : e.severity === "critical"
                        ? "text-critical border-critical/60"
                        : "text-paper border-bronze/60";
                return (
                  <li key={e.id} className="relative pb-6 pl-12">
                    <div className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center border bg-background ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-xs uppercase tracking-widest text-paper">
                        {e.title}
                      </div>
                      <div className="font-mono text-[11px] text-wire">{e.occurredAt}</div>
                    </div>
                    <p className="mt-1.5 text-sm text-paper-muted">{e.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-wire">
                      <span>SLOT {e.slot.toLocaleString()}</span>
                      <span>·</span>
                      <span>SIG {e.signature.slice(0, 8)}…</span>
                      <CopyButton value={e.signature} label="sig" />
                      <span>·</span>
                      <span className={e.confidence === "high" ? "text-verified" : "text-amber"}>
                        {e.confidence} confidence
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <div className="lg:col-span-4 space-y-6">
          <Panel eyebrow="Anomaly panel" title="Watchlist signals">
            {agent.failedWindows === 0 ? (
              <div className="font-mono text-sm text-paper-muted">
                No critical anomalies detected.
                <div className="mt-2 text-xs text-wire">This is uncommon. Enjoy it quietly.</div>
              </div>
            ) : agent.grade === "SPX BB" || agent.grade === "SPX B" || agent.grade === "SPX D" ? (
              <div className="space-y-3">
                <div className="border-l-2 border-critical pl-3">
                  <div className="font-mono text-xs uppercase tracking-widest text-critical">
                    Execution gap
                  </div>
                  <p className="mt-1 text-sm text-paper-muted">
                    {agent.failedWindows} failed buyback windows observed. The tape has developed a limp.
                  </p>
                </div>
                <div className="border-l-2 border-amber pl-3">
                  <div className="font-mono text-xs uppercase tracking-widest text-amber">
                    Operator silence
                  </div>
                  <p className="mt-1 text-sm text-paper-muted">
                    Operator has not signed a verification. SPX402 cannot attest to control.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-l-2 border-amber pl-3">
                  <div className="font-mono text-xs uppercase tracking-widest text-amber">
                    Minor drift
                  </div>
                  <p className="mt-1 text-sm text-paper-muted">
                    {agent.failedWindows} failed windows recorded. SPX402 has opened a file.
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Configuration" title="Agent parameters">
            <dl className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-bronze/30 pb-2">
                <dt className="text-wire">BUYBACK_BPS</dt>
                <dd className="text-paper">{agent.buybackBps}</dd>
              </div>
              <div className="flex justify-between border-b border-bronze/30 pb-2">
                <dt className="text-wire">LAST CONFIG CHANGE</dt>
                <dd className="text-paper">{agent.configLastChangedLabel}</dd>
              </div>
              <div className="flex justify-between border-b border-bronze/30 pb-2">
                <dt className="text-wire">LAST BUYBACK</dt>
                <dd className="text-paper">{agent.lastBuybackLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-wire">LAST BURN</dt>
                <dd className="text-paper">{agent.lastBurnLabel}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>

      {/* PRICE CONTEXT */}
      <Panel
        className="mt-6"
        eyebrow="Price context"
        title="Market data shown for context only"
        right={
          <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
            Excluded from Transparency Score
          </span>
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={agent.priceSeries}>
              <defs>
                <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.32 0.04 65)" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="t" stroke="var(--wire)" tick={{ fontSize: 10, fontFamily: "monospace" }} />
              <YAxis stroke="var(--wire)" tick={{ fontSize: 10, fontFamily: "monospace" }} width={70} />
              <Tooltip
                contentStyle={{
                  background: "var(--panel-deep)",
                  border: "1px solid var(--bronze)",
                  borderRadius: 0,
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--wire)" }}
              />
              <Area type="monotone" dataKey="v" stroke="var(--amber)" strokeWidth={2} fill="url(#amberFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* RAW TX TABLE */}
      <Panel className="mt-6" eyebrow="Raw transactions" title="Decoded events">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-bronze/50 text-left text-[10px] uppercase tracking-widest text-wire">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Slot</th>
                <th className="px-3 py-2">Signature</th>
                <th className="px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {agent.events.map((e) => (
                <tr key={e.id} className="border-b border-bronze/20 hover:bg-panel-deep/40">
                  <td className="px-3 py-2.5 text-paper-muted">{e.occurredAt}</td>
                  <td className="px-3 py-2.5 text-paper">{e.title}</td>
                  <td className="px-3 py-2.5 text-paper-muted">{e.asset ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-paper">
                    {e.amount ?? e.tokenAmount ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-wire">{e.slot.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-amber">{e.signature.slice(0, 12)}…</td>
                  <td className={`px-3 py-2.5 ${e.confidence === "high" ? "text-verified" : e.confidence === "medium" ? "text-amber" : "text-critical"}`}>
                    {e.confidence}
                  </td>
                </tr>
              ))}
              {agent.events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-paper-muted">
                    No raw events to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* DISCLAIMER */}
      <div className="mt-10 border-l-2 border-bronze bg-panel-deep/60 p-5">
        <div className="label-amber">Disclaimer</div>
        <p className="mt-2 text-sm leading-relaxed text-paper-muted">
          SPX402 verifies observable on-chain events. It does not verify off-chain
          revenue, service quality, future buybacks, token value, or operator intent.
          A high Transparency Score does not mean a token is safe, valuable, or
          suitable to buy. Buybacks may not occur, may occur irregularly, or may
          stop entirely. Read the full <Link to="/disclaimer" className="text-amber hover:underline">disclaimer</Link>.
        </p>
      </div>
    </div>
  );
}

function WatchlistButton({ mint, symbol }: { mint: string; symbol: string }) {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    isOnWatchlist(user.id, mint)
      .then((v) => { if (!cancelled) setTracked(v); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, [user, mint]);

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
      >
        <Activity className="h-3.5 w-3.5" /> Sign in to watchlist
      </Link>
    );
  }

  const toggle = async () => {
    if (busy || !checked) return;
    setBusy(true);
    try {
      if (tracked) {
        await removeFromWatchlist(user.id, mint);
        setTracked(false);
      } else {
        await addToWatchlist(user.id, mint, symbol);
        setTracked(true);
      }
    } catch {
      /* swallow — UI stays as-is */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy || !checked}
      className={
        tracked
          ? "inline-flex items-center gap-2 border border-verified/80 bg-verified/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-verified hover:border-critical hover:text-critical disabled:opacity-50"
          : "inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-50"
      }
    >
      {tracked ? <Check className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
      {tracked ? "On watchlist" : "Add to watchlist"}
    </button>
  );
}
