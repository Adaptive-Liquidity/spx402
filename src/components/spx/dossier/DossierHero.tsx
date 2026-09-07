import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Bell, Check, ShieldCheck, ShieldOff } from "lucide-react";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { TransparencyScoreRing } from "@/components/spx/TransparencyScoreRing";
import { Panel } from "@/components/spx/Panel";
import { ShareCard } from "@/components/spx/ShareCard";
import { buildGradeCard } from "@/lib/grade-card";
import type { Agent } from "@/lib/agents";
import { categoryMeta } from "@/lib/agents/categories";
import { useAuth } from "@/lib/auth";
import { addToWatchlist, isOnWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import {
  createSubscription,
  deleteSubscription,
  fetchSubscriptionForMint,
  type AlertSubscription,
} from "@/lib/alerts";
import { SCORING_VERSION } from "@/lib/versions";
import { CopyButton, dossierFlags, scorePillarsFor, shortMint } from "./dossier-utils";

export function DossierHero({ agent }: { agent: Agent }) {
  const cat = categoryMeta(agent.category);
  const flags = dossierFlags(agent);
  const scorePillars = scorePillarsFor(agent, flags);
  const isSPX404 = agent.grade === "SPX404";

  return (
    <>
      {/* Flagged-agent warning banner — permanent, public chain of custody */}
      {agent.flagged && (
        <div className="mb-6 border-2 border-critical bg-critical/10 p-5">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-critical" />
            <div className="flex-1">
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-critical">
                Flagged by SPX402 — trust violation
              </div>
              <p className="mt-1 text-sm text-paper">
                This agent has been flagged and is excluded from the leaderboard, explorer, homepage
                tape, and ticker. Dossier remains public for auditability.
              </p>
              {agent.flagReason && (
                <p className="mt-2 font-mono text-xs text-critical/90">
                  Reason: {agent.flagReason}
                  {agent.flaggedAt && (
                    <span className="ml-2 text-wire">
                      · flagged {new Date(agent.flaggedAt).toISOString().slice(0, 10)}
                    </span>
                  )}
                </p>
              )}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-wire">
                Dispute? Email <span className="text-amber">disputes@spx402.com</span> with on-chain
                evidence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-bronze/50 bg-panel-deep/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-wire">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>
            <span className="text-amber">SPX402</span> / AGENT DOSSIER / SOLANA MAINNET
          </span>
          <span>PARSER {agent.parserVersion}</span>
          <span>LAST INDEXED {agent.lastIndexedSeconds}s AGO</span>
          <span>
            CONFIDENCE{" "}
            <span
              className={
                agent.confidence === "high"
                  ? "text-verified"
                  : agent.confidence === "medium"
                    ? "text-amber"
                    : "text-critical"
              }
            >
              {agent.confidence.toUpperCase()}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-verified pulse-amber" />
          ON-CHAIN VERIFIED
        </div>
      </div>

      {/* HERO PANEL */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="panel-engraved relative lg:col-span-8 p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="label-amber">
                  {cat.longLabel} {isSPX404 ? "· not found" : "confirmed"}
                </div>
              </div>

              <h1 className="mt-3 font-display text-5xl font-bold text-paper">
                {flags.isTokenized ? `$${agent.symbol}` : agent.name}
              </h1>
              <div className="mt-1 text-lg text-paper-muted">
                {flags.isTokenized ? agent.name : `$${agent.symbol}`}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-wire">
                  {cat.identifierLabel.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-paper">{shortMint(agent.identifier)}</span>
                <CopyButton value={agent.identifier} />
              </div>
              {flags.isExecutor &&
                agent.executorWallet &&
                agent.executorWallet !== agent.identifier && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-wire">EXECUTOR</span>
                    <span className="font-mono text-xs text-paper">
                      {shortMint(agent.executorWallet)}
                    </span>
                    <CopyButton value={agent.executorWallet} />
                    <Link
                      to="/operator/$wallet"
                      params={{ wallet: agent.executorWallet }}
                      className="font-mono text-[10px] uppercase tracking-widest text-amber hover:underline"
                    >
                      operator profile ↗
                    </Link>
                  </div>
                )}
              {flags.isRegistered && agent.coreAsset && agent.coreAsset !== agent.identifier && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-wire">MPL ASSET</span>
                  <span className="font-mono text-xs text-paper">{shortMint(agent.coreAsset)}</span>
                  <CopyButton value={agent.coreAsset} />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              {/* Chain badge — SPX402 indexes Solana and Base as separate
                  lanes and never merges identities across them. */}
              <span
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                  agent.chain === "base"
                    ? "border-[#0052ff]/70 bg-[#0052ff]/10 text-[#7aa2ff]"
                    : "border-bronze/70 bg-panel-deep/60 text-paper-muted"
                }`}
                title={`Indexed on the ${agent.chain} settlement lane`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    agent.chain === "base" ? "bg-[#0052ff]" : "bg-amber"
                  }`}
                />
                {agent.chain}
              </span>
              <ExecutionGradeBadge
                grade={agent.grade}
                size="lg"
                confidenceScore={agent.confidenceScore}
              />
              {/* Wave 2 — explicit numeric confidence chip. Outlined badge
                  + low-confidence chip together signal "thin evidence base." */}
              <span
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                  agent.confidenceScore >= 0.66
                    ? "border-verified/70 bg-verified/10 text-verified"
                    : agent.confidenceScore >= 0.33
                      ? "border-amber/70 bg-amber/10 text-amber"
                      : "border-wire/70 bg-panel-deep/60 text-paper-muted"
                }`}
                title={`${agent.confidenceModelVersion} · ${agent.methodologyVersion}`}
              >
                Confidence {(agent.confidenceScore * 100).toFixed(0)}%
              </span>
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
            <AlertSubscribeButton mint={agent.mint} />
            {/* Wave 1c — machine-readable evidence bundle (Merkle-rooted). */}
            <a
              href={`/api/public/agent/${agent.mint}/evidence`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
              title="Canonical evidence JSON with Merkle root over the 30-day window"
            >
              Evidence bundle ↗
            </a>
            {/* Wave 4 — embeddable widget for partner sites. */}
            <a
              href={`/embed/${agent.mint}`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
              title="Iframe-friendly badge widget"
            >
              Embed widget ↗
            </a>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <ShareCard card={buildGradeCard(agent)} />

          <Panel eyebrow="SPX Execution Score" title="Reputation pillars">
            <div className="flex flex-col items-center">
              <TransparencyScoreRing score={agent.score} />
            </div>
            <div className="mt-6 space-y-4">
              {scorePillars.map((row) => {
                const pct = row.max === 0 ? 0 : (row.value / row.max) * 100;
                return (
                  <div key={row.pillar}>
                    <div className="flex items-baseline justify-between">
                      <span className={`font-display text-sm font-semibold ${row.tone}`}>
                        {row.pillar}
                      </span>
                      <span className="num-display text-sm text-paper">
                        {row.value} <span className="text-wire">/ {row.max}</span>
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-wire">
                      {row.hint}
                    </div>
                    <div className="mt-1.5 h-1 w-full bg-bronze-dim/60">
                      <div className="h-full bg-amber" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 border-t border-bronze/30 pt-4 text-[10px] font-mono uppercase tracking-widest text-wire">
              Pillars compose the SPX Execution Score. Methodology · {SCORING_VERSION}
            </div>
          </Panel>
        </div>
      </div>
    </>
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
      .then((v) => {
        if (!cancelled) setTracked(v);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, mint]);

  if (!user) {
    return (
      <Link
        to="/login"
        className="focus-ring inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
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

function AlertSubscribeButton({ mint }: { mint: string }) {
  const { user } = useAuth();
  const [subId, setSubId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setReady(true);
      return;
    }
    fetchSubscriptionForMint(user.id, mint)
      .then((s: AlertSubscription | null) => setSubId(s?.id ?? null))
      .catch(() => setSubId(null))
      .finally(() => setReady(true));
  }, [user, mint]);

  if (!user) {
    return (
      <Link
        to="/login"
        className="focus-ring inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
      >
        <Bell className="h-3.5 w-3.5" /> Sign in for alerts
      </Link>
    );
  }

  const onClick = async () => {
    setBusy(true);
    try {
      if (subId) {
        await deleteSubscription(subId);
        setSubId(null);
      } else {
        const row = await createSubscription(user.id, mint);
        setSubId(row.id);
      }
    } catch {
      /* surfaced by the dashboard on next load */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy || !ready}
      className={
        subId
          ? "inline-flex items-center gap-2 border border-verified/80 bg-verified/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-verified hover:border-critical hover:text-critical disabled:opacity-50"
          : "inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-50"
      }
    >
      <Bell className="h-3.5 w-3.5" />
      {subId ? "Alerts on" : "Subscribe to alerts"}
    </button>
  );
}
