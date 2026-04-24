// SPX402 seed data — demo agents.
// Real Helius/Pump indexer can write into the same shape later.

export type Grade =
  | "SPX AAA"
  | "SPX AA"
  | "SPX A"
  | "SPX BBB"
  | "SPX BB"
  | "SPX B"
  | "SPX D"
  | "SPX404";

export type EventType =
  | "DEPOSIT_RECEIVED"
  | "BUYBACK_EXECUTED"
  | "BURN_CONFIRMED"
  | "CONFIG_CHANGED"
  | "FAILED_WINDOW"
  | "ANOMALY_DETECTED"
  | "OPERATOR_VERIFIED";

export type Severity = "info" | "warn" | "critical" | "success";

export interface AgentEvent {
  id: string;
  type: EventType;
  severity: Severity;
  title: string;
  description: string;
  signature: string;
  asset?: string;
  amount?: number;
  tokenAmount?: number;
  slot: number;
  confidence: "high" | "medium" | "low";
  occurredAt: string; // relative label
  iso: string;
}

export interface AgentScoreBreakdown {
  depositConsistency: number; // out of 20
  buybackExecution: number; // out of 25
  burnConfirmation: number; // out of 20
  failedTx: number; // out of 15
  recency: number; // out of 10
  metadata: number; // out of 5
  operator: number; // out of 5
}

export interface Agent {
  mint: string;
  symbol: string;
  name: string;
  tagline: string;
  grade: Grade;
  score: number | null;
  status: "active" | "degraded" | "stale" | "inactive" | "unknown";
  operatorVerified: boolean;
  confidence: "high" | "medium" | "low";
  parserVersion: string;
  lastIndexedSeconds: number;
  // stats
  totalDepositsCount: number;
  totalBuybacksCount: number;
  totalBurnsCount: number;
  failedWindows: number;
  totalDepositedSol: number;
  totalBuybackSol: number;
  totalBurnedTokens: number;
  buybackExecutionRate: number; // 0..1
  burnConfirmationRate: number; // 0..1
  buybackBps: number;
  lastBuybackLabel: string;
  lastBurnLabel: string;
  configLastChangedLabel: string;
  scoreBreakdown: AgentScoreBreakdown;
  verdict: string;
  events: AgentEvent[];
  priceSeries: { t: string; v: number }[];
}

const sig = (seed: string, n: number) =>
  `${seed}${n.toString(36)}xQ${(n * 7919).toString(36)}p4z9${(n * 13).toString(36)}`;

const priceSeries = (start: number, drift: number, vol: number, n = 48) => {
  let v = start;
  const out: { t: string; v: number }[] = [];
  for (let i = 0; i < n; i++) {
    v = Math.max(0.0001, v + (Math.random() - 0.5) * vol + drift);
    out.push({ t: `${i}`, v: Number(v.toFixed(6)) });
  }
  return out;
};

export const AGENTS: Agent[] = [
  {
    mint: "7xKQ92pLm4nBvR8sT3jYwZcA1pXqFhNeUgD5sM2QnK7p",
    symbol: "NOVA",
    name: "Agent Nova",
    tagline: "Operational. Minor gaps. Still awake.",
    grade: "SPX AA",
    score: 87,
    status: "active",
    operatorVerified: true,
    confidence: "high",
    parserVersion: "v0.1.7",
    lastIndexedSeconds: 14,
    totalDepositsCount: 847,
    totalBuybacksCount: 842,
    totalBurnsCount: 842,
    failedWindows: 5,
    totalDepositedSol: 42.31,
    totalBuybackSol: 38.08,
    totalBurnedTokens: 12_481_992,
    buybackExecutionRate: 0.964,
    burnConfirmationRate: 1.0,
    buybackBps: 3000,
    lastBuybackLabel: "14 minutes ago",
    lastBurnLabel: "14 minutes ago",
    configLastChangedLabel: "3 days ago",
    scoreBreakdown: {
      depositConsistency: 18,
      buybackExecution: 24,
      burnConfirmation: 20,
      failedTx: 11,
      recency: 9,
      metadata: 5,
      operator: 5,
    },
    verdict:
      "Tokenized Agent confirmed. Buybacks and burns are executing with minor gaps.",
    events: [
      {
        id: "n1",
        type: "BUYBACK_EXECUTED",
        severity: "success",
        title: "BUYBACK_EXECUTED",
        description: "2.1 SOL routed into NOVA via Tokenized Agent Authority.",
        signature: sig("nova", 1),
        asset: "SOL",
        amount: 2.1,
        slot: 298_441_222,
        confidence: "high",
        occurredAt: "14 minutes ago",
        iso: "2026-04-24T16:42:11Z",
      },
      {
        id: "n2",
        type: "BURN_CONFIRMED",
        severity: "success",
        title: "BURN_CONFIRMED",
        description: "142,000 NOVA removed from circulating supply.",
        signature: sig("nova", 2),
        asset: "NOVA",
        tokenAmount: 142_000,
        slot: 298_441_223,
        confidence: "high",
        occurredAt: "14 minutes ago",
        iso: "2026-04-24T16:42:11Z",
      },
      {
        id: "n3",
        type: "DEPOSIT_RECEIVED",
        severity: "info",
        title: "DEPOSIT_RECEIVED",
        description: "450 USDC deposited to Agent Deposit Address.",
        signature: sig("nova", 3),
        asset: "USDC",
        amount: 450,
        slot: 298_440_991,
        confidence: "high",
        occurredAt: "1h 13m ago",
        iso: "2026-04-24T15:43:00Z",
      },
      {
        id: "n4",
        type: "FAILED_WINDOW",
        severity: "warn",
        title: "FAILED_WINDOW",
        description: "Buyback window missed. Recovered next cycle.",
        signature: sig("nova", 4),
        slot: 298_402_111,
        confidence: "medium",
        occurredAt: "11h ago",
        iso: "2026-04-24T05:42:11Z",
      },
      {
        id: "n5",
        type: "CONFIG_CHANGED",
        severity: "warn",
        title: "CONFIG_CHANGED",
        description: "buyback_bps changed from 2500 to 3000.",
        signature: sig("nova", 5),
        slot: 298_001_000,
        confidence: "high",
        occurredAt: "3 days ago",
        iso: "2026-04-21T11:00:00Z",
      },
    ],
    priceSeries: priceSeries(0.0042, 0.00002, 0.0003),
  },
  {
    mint: "ARiA8sT3jYwZcA1pXqFhNeUgD5sM2QnK7p7xKQ92pLm",
    symbol: "ARIA",
    name: "Aria Research Agent",
    tagline: "Active. Not elegant.",
    grade: "SPX A",
    score: 76,
    status: "active",
    operatorVerified: false,
    confidence: "high",
    parserVersion: "v0.1.7",
    lastIndexedSeconds: 41,
    totalDepositsCount: 203,
    totalBuybacksCount: 171,
    totalBurnsCount: 171,
    failedWindows: 12,
    totalDepositedSol: 11.04,
    totalBuybackSol: 9.42,
    totalBurnedTokens: 2_104_771,
    buybackExecutionRate: 0.842,
    burnConfirmationRate: 1.0,
    buybackBps: 2500,
    lastBuybackLabel: "3 hours ago",
    lastBurnLabel: "3 hours ago",
    configLastChangedLabel: "12 days ago",
    scoreBreakdown: {
      depositConsistency: 16,
      buybackExecution: 20,
      burnConfirmation: 20,
      failedTx: 8,
      recency: 7,
      metadata: 5,
      operator: 0,
    },
    verdict:
      "Tokenized Agent confirmed. Execution active. Operator unverified.",
    events: [
      {
        id: "a1",
        type: "BUYBACK_EXECUTED",
        severity: "success",
        title: "BUYBACK_EXECUTED",
        description: "0.6 SOL routed into ARIA.",
        signature: sig("aria", 1),
        asset: "SOL",
        amount: 0.6,
        slot: 298_400_010,
        confidence: "high",
        occurredAt: "3 hours ago",
        iso: "2026-04-24T13:42:11Z",
      },
      {
        id: "a2",
        type: "FAILED_WINDOW",
        severity: "warn",
        title: "FAILED_WINDOW",
        description: "Buyback window missed.",
        signature: sig("aria", 2),
        slot: 298_390_010,
        confidence: "medium",
        occurredAt: "5 hours ago",
        iso: "2026-04-24T11:42:11Z",
      },
      {
        id: "a3",
        type: "DEPOSIT_RECEIVED",
        severity: "info",
        title: "DEPOSIT_RECEIVED",
        description: "120 USDC deposited.",
        signature: sig("aria", 3),
        asset: "USDC",
        amount: 120,
        slot: 298_380_010,
        confidence: "high",
        occurredAt: "7 hours ago",
        iso: "2026-04-24T09:42:11Z",
      },
    ],
    priceSeries: priceSeries(0.0011, -0.000005, 0.00018),
  },
  {
    mint: "FLuX3jYwZcA1pXqFhNeUgD5sM2QnK7p7xKQ92pLm4nB",
    symbol: "FLUX",
    name: "Flux Task Agent",
    tagline: "Inconsistent. The tape is not impressed.",
    grade: "SPX BB",
    score: 48,
    status: "degraded",
    operatorVerified: false,
    confidence: "medium",
    parserVersion: "v0.1.7",
    lastIndexedSeconds: 122,
    totalDepositsCount: 92,
    totalBuybacksCount: 38,
    totalBurnsCount: 35,
    failedWindows: 41,
    totalDepositedSol: 6.71,
    totalBuybackSol: 2.82,
    totalBurnedTokens: 411_220,
    buybackExecutionRate: 0.413,
    burnConfirmationRate: 0.921,
    buybackBps: 1500,
    lastBuybackLabel: "28 hours ago",
    lastBurnLabel: "28 hours ago",
    configLastChangedLabel: "6 days ago",
    scoreBreakdown: {
      depositConsistency: 9,
      buybackExecution: 11,
      burnConfirmation: 16,
      failedTx: 5,
      recency: 2,
      metadata: 5,
      operator: 0,
    },
    verdict:
      "Execution patterns degraded. Deposits routed without matching buybacks.",
    events: [
      {
        id: "f1",
        type: "ANOMALY_DETECTED",
        severity: "critical",
        title: "ANOMALY_DETECTED",
        description: "Large deposit observed. No matching buyback after expected window.",
        signature: sig("flux", 1),
        asset: "USDC",
        amount: 1200,
        slot: 298_300_001,
        confidence: "medium",
        occurredAt: "9 hours ago",
        iso: "2026-04-24T07:42:11Z",
      },
      {
        id: "f2",
        type: "FAILED_WINDOW",
        severity: "warn",
        title: "FAILED_WINDOW",
        description: "Buyback window missed for 4th consecutive cycle.",
        signature: sig("flux", 2),
        slot: 298_280_001,
        confidence: "medium",
        occurredAt: "11 hours ago",
        iso: "2026-04-24T05:42:11Z",
      },
      {
        id: "f3",
        type: "BUYBACK_EXECUTED",
        severity: "success",
        title: "BUYBACK_EXECUTED",
        description: "0.18 SOL routed into FLUX.",
        signature: sig("flux", 3),
        asset: "SOL",
        amount: 0.18,
        slot: 298_100_001,
        confidence: "high",
        occurredAt: "28 hours ago",
        iso: "2026-04-23T12:42:11Z",
      },
    ],
    priceSeries: priceSeries(0.0006, -0.00001, 0.00012),
  },
  {
    mint: "NULL404pXqFhNeUgD5sM2QnK7p7xKQ92pLm4nBvR8sT",
    symbol: "NULL",
    name: "Null Agent",
    tagline: "No receipts. No rating.",
    grade: "SPX404",
    score: null,
    status: "inactive",
    operatorVerified: false,
    confidence: "low",
    parserVersion: "v0.1.7",
    lastIndexedSeconds: 4_200,
    totalDepositsCount: 0,
    totalBuybacksCount: 0,
    totalBurnsCount: 0,
    failedWindows: 0,
    totalDepositedSol: 0,
    totalBuybackSol: 0,
    totalBurnedTokens: 0,
    buybackExecutionRate: 0,
    burnConfirmationRate: 0,
    buybackBps: 0,
    lastBuybackLabel: "never",
    lastBurnLabel: "never",
    configLastChangedLabel: "never",
    scoreBreakdown: {
      depositConsistency: 0,
      buybackExecution: 0,
      burnConfirmation: 0,
      failedTx: 0,
      recency: 0,
      metadata: 0,
      operator: 0,
    },
    verdict:
      "Agent not found, inactive, or lacking enough evidence for a grade.",
    events: [],
    priceSeries: priceSeries(0.0001, 0, 0.00002),
  },
  {
    mint: "SPX402pLm4nBvR8sT3jYwZcA1pXqFhNeUgD5sM2QnK7",
    symbol: "SPX402",
    name: "SPX402",
    tagline: "Scored by the same methodology as every other agent.",
    grade: "SPX AAA",
    score: 91,
    status: "active",
    operatorVerified: true,
    confidence: "high",
    parserVersion: "v0.1.7",
    lastIndexedSeconds: 8,
    totalDepositsCount: 1_204,
    totalBuybacksCount: 1_204,
    totalBurnsCount: 1_204,
    failedWindows: 0,
    totalDepositedSol: 88.92,
    totalBuybackSol: 80.03,
    totalBurnedTokens: 28_402_117,
    buybackExecutionRate: 1.0,
    burnConfirmationRate: 1.0,
    buybackBps: 4000,
    lastBuybackLabel: "8 seconds ago",
    lastBurnLabel: "8 seconds ago",
    configLastChangedLabel: "21 days ago",
    scoreBreakdown: {
      depositConsistency: 20,
      buybackExecution: 25,
      burnConfirmation: 20,
      failedTx: 14,
      recency: 10,
      metadata: 5,
      operator: 5,
    },
    verdict:
      "SPX402 is scored by the same methodology as every tracked agent. If execution fails, the grade falls.",
    events: [
      {
        id: "s1",
        type: "BUYBACK_EXECUTED",
        severity: "success",
        title: "BUYBACK_EXECUTED",
        description: "3.4 SOL routed into SPX402.",
        signature: sig("spx", 1),
        asset: "SOL",
        amount: 3.4,
        slot: 298_441_999,
        confidence: "high",
        occurredAt: "8 seconds ago",
        iso: "2026-04-24T16:56:11Z",
      },
      {
        id: "s2",
        type: "OPERATOR_VERIFIED",
        severity: "success",
        title: "OPERATOR_VERIFIED",
        description: "Ed25519 signature confirmed against creator wallet.",
        signature: sig("spx", 2),
        slot: 297_001_000,
        confidence: "high",
        occurredAt: "21 days ago",
        iso: "2026-04-03T11:00:00Z",
      },
    ],
    priceSeries: priceSeries(0.0089, 0.00003, 0.0004),
  },
];

export function getAgent(mintOrSymbol: string): Agent | null {
  const q = mintOrSymbol.trim().toLowerCase();
  return (
    AGENTS.find(
      (a) =>
        a.mint.toLowerCase() === q ||
        a.symbol.toLowerCase() === q ||
        a.mint.toLowerCase().startsWith(q),
    ) ?? null
  );
}

export function gradeColor(grade: Grade): string {
  if (grade === "SPX AAA" || grade === "SPX AA") return "verified";
  if (grade === "SPX A" || grade === "SPX BBB") return "amber";
  if (grade === "SPX BB" || grade === "SPX B") return "amber-dim";
  if (grade === "SPX D" || grade === "SPX404") return "critical";
  return "paper-muted";
}

export const TICKER_LINES = [
  "NOVA  SPX AA  87  ▲ buyback 14m",
  "ARIA  SPX A   76  ▲ buyback 3h",
  "FLUX  SPX BB  48  ▼ no buyback 28h",
  "NULL  SPX404  --  insufficient evidence",
  "SPX402 SPX AAA 91 ▲ buyback 8s",
  "PARSER v0.1.7  ALL SYSTEMS NOMINAL",
  "HTTP 402  PAYMENT REQUIRED  PROOF PROVIDED",
];
