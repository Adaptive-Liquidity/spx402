// Single source of truth for the SPX402 grade card — the one share object.
//
// Rendered three ways from this same model: as HTML on the dossier page, as
// SVG (badge / embeds), and as PNG (link unfurls). Nothing here invents data:
// a missing on-chain fact prints NONE (dates) or 0 (counts).

import type { Agent, AgentEvent } from "@/lib/agents";

export interface GradeCardRow {
  label: string;
  value: string;
}

export interface GradeCardModel {
  ticker: string;
  mint: string;
  grade: string;
  /** true when the grade is a failing one (SPX D / SPX404) → danger red. */
  danger: boolean;
  operator: "VERIFIED" | "UNVERIFIED";
  rows: GradeCardRow[];
  url: string;
  lastBuyback: string;
}

export const CARD_COLORS = {
  page: "#08090B",
  panel: "#101114",
  line: "#2A2D32",
  bone: "#E7E2D6",
  mute: "#8B9098",
  metal: "#C4A574",
  blood: "#C4453A",
} as const;

export const SITE_ORIGIN = "https://spx402.com";

const DAY = 86_400_000;

/** "11d ago" / "4h ago" / "NONE". Never guesses. */
export function ageLabel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "NONE";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "NONE";
  const ms = Math.max(0, now - t);
  if (ms < 3_600_000) return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
  if (ms < DAY) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / DAY)}d ago`;
}

function latestIso(events: AgentEvent[], types: string[]): string | null {
  let best: number | null = null;
  for (const e of events) {
    if (!types.includes(e.type)) continue;
    const t = Date.parse(e.iso ?? "");
    if (Number.isFinite(t) && (best === null || t > best)) best = t;
  }
  return best === null ? null : new Date(best).toISOString();
}

/**
 * Falls back to the stored relative label only when it carries a real value.
 * "—" / "" / "never" all collapse to NONE.
 */
function fromLabel(label: string | null | undefined): string {
  const v = (label ?? "").trim();
  if (!v || v === "—" || v === "-" || v.toLowerCase() === "never") return "NONE";
  return v;
}

export function buildGradeCard(agent: Agent, now = Date.now()): GradeCardModel {
  const events = agent.events ?? [];
  const buybackIso = latestIso(events, ["BUYBACK_EXECUTED", "SWAP_EXECUTED"]);
  const burnIso = latestIso(events, ["BURN_CONFIRMED"]);

  const lastBuyback = buybackIso ? ageLabel(buybackIso, now) : fromLabel(agent.lastBuybackLabel);
  const lastBurn = burnIso ? ageLabel(burnIso, now) : fromLabel(agent.lastBurnLabel);

  const grade = agent.grade ?? "SPX404";

  return {
    ticker: `$${(agent.symbol || "AGENT").toUpperCase()}`,
    mint: agent.mint,
    grade,
    danger: grade === "SPX D" || grade === "SPX404",
    operator: agent.operatorVerified ? "VERIFIED" : "UNVERIFIED",
    rows: [
      { label: "Last buyback", value: lastBuyback },
      { label: "Last burn", value: lastBurn },
      { label: "Buybacks", value: String(agent.totalBuybacksCount ?? 0) },
      { label: "Failed windows", value: String(agent.failedWindows ?? 0) },
    ],
    url: `spx402.com/agent/${agent.mint}`,
    lastBuyback,
  };
}

/** "$TICKER · SPX D · last buyback 11d ago" — the unfurl headline. */
export function cardShareTitle(card: GradeCardModel): string {
  return `${card.ticker} · ${card.grade} · last buyback ${card.lastBuyback}`;
}

/** Absolute PNG URL for og:image / twitter:image. */
export function cardImageUrl(mint: string, origin = SITE_ORIGIN): string {
  return `${origin}/api/public/card/${mint}.png`;
}

/** Fallback model for a subject we have never indexed. Nothing is invented. */
export function unindexedCard(subject: string): GradeCardModel {
  return {
    ticker: "$AGENT",
    mint: subject,
    grade: "SPX404",
    danger: true,
    operator: "UNVERIFIED",
    rows: [
      { label: "Last buyback", value: "NONE" },
      { label: "Last burn", value: "NONE" },
      { label: "Buybacks", value: "0" },
      { label: "Failed windows", value: "0" },
    ],
    url: `spx402.com/agent/${subject}`,
    lastBuyback: "NONE",
  };
}
