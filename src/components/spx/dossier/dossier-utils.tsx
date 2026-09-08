import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Copy,
  Flame,
  Repeat,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { Agent, AgentEvent, EventType, Severity } from "@/lib/agents";
import { relativeFromNow, type AgentEventRow } from "@/lib/live-data";

export const KNOWN_EVENT_TYPES: EventType[] = [
  "DEPOSIT_RECEIVED",
  "BUYBACK_EXECUTED",
  "BURN_CONFIRMED",
  "CONFIG_CHANGED",
  "FAILED_WINDOW",
  "ANOMALY_DETECTED",
  "OPERATOR_VERIFIED",
  "SWAP_EXECUTED",
  "X402_PAYMENT_RECEIVED",
  "TASK_COMPLETED",
  "OC_OPENED",
  "OC_AWARDED",
  "OC_FULFILLED",
  "OC_FAILED",
  "OC_SLASHED",
  // AEON primitives
  "ESCROW_CREATED",
  "ESCROW_RELEASED",
  "ESCROW_CANCELED",
  "BOND_DEPOSITED",
  "BOND_SLASHED",
  "RECEIPT_CREATED",
  "AEON_PAYMENT",
  "AEON_AGENT_REGISTERED",
  "AEON_AUTHORITY_ISSUED",
  "AEON_AUTHORITY_REVOKED",
  "AEON_AUTHORITY_EXPIRED",
  "AEON_ATOMIC_SPLIT",
  "AEON_ORG_CREATED",
  "AEON_ORG_DEPOSIT",
  "AEON_ORG_SPLIT",
  "AEON_ORG_DISSOLVED",
  "AEON_ORG_JOINED",
  "AEON_ORG_SHARE_SET",
  "AEON_ORG_RESIDUAL_RECLAIMED",
  "AEON_PAUSE_SET",
  "AEON_CONFIG_INITIALIZED",
];

export const KNOWN_SEVERITIES: Severity[] = ["info", "warn", "critical", "success"];

export function eventTitleFor(type: string): string {
  switch (type) {
    case "DEPOSIT_RECEIVED":
      return "Deposit received";
    case "BUYBACK_EXECUTED":
      return "Buyback executed";
    case "BURN_CONFIRMED":
      return "Burn confirmed";
    case "CONFIG_CHANGED":
      return "Config changed";
    case "FAILED_WINDOW":
      return "Failed buyback window";
    case "ANOMALY_DETECTED":
      return "Anomaly detected";
    case "OPERATOR_VERIFIED":
      return "Operator verified";
    case "SWAP_EXECUTED":
      return "DEX swap executed";
    case "X402_PAYMENT_RECEIVED":
      return "x402 payment received";
    case "TASK_COMPLETED":
      return "Task completed";
    case "OC_OPENED":
      return "Outcome Contract opened";
    case "OC_AWARDED":
      return "Outcome Contract awarded";
    case "OC_FULFILLED":
      return "Outcome Contract fulfilled";
    case "OC_FAILED":
      return "Outcome Contract failed";
    case "OC_SLASHED":
      return "Outcome Contract slashed";
    // AEON primitives
    case "ESCROW_CREATED":
      return "Escrow created";
    case "ESCROW_RELEASED":
      return "Escrow released";
    case "ESCROW_CANCELED":
      return "Escrow canceled";
    case "BOND_DEPOSITED":
      return "Bond deposited";
    case "BOND_SLASHED":
      return "Bond slashed";
    case "RECEIPT_CREATED":
      return "Receipt created";
    case "AEON_PAYMENT":
      return "AEON payment";
    case "AEON_AGENT_REGISTERED":
      return "AEON agent registered";
    case "AEON_AUTHORITY_ISSUED":
      return "AEON authority issued";
    case "AEON_AUTHORITY_REVOKED":
      return "AEON authority revoked";
    case "AEON_AUTHORITY_EXPIRED":
      return "AEON authority expired";
    case "AEON_ATOMIC_SPLIT":
      return "AEON atomic split";
    case "AEON_ORG_CREATED":
      return "AEON org created";
    case "AEON_ORG_DEPOSIT":
      return "AEON org deposit";
    case "AEON_ORG_SPLIT":
      return "AEON org split";
    case "AEON_ORG_DISSOLVED":
      return "AEON org dissolved";
    case "AEON_ORG_JOINED":
      return "AEON org joined";
    case "AEON_ORG_SHARE_SET":
      return "AEON org share set";
    case "AEON_ORG_RESIDUAL_RECLAIMED":
      return "AEON org residual reclaimed";
    case "AEON_PAUSE_SET":
      return "AEON pause updated";
    case "AEON_CONFIG_INITIALIZED":
      return "AEON config initialized";
    default:
      return type;
  }
}

export function eventDescFor(row: AgentEventRow): string {
  switch (row.type) {
    case "DEPOSIT_RECEIVED":
      return `${row.amountSol.toFixed(4)} SOL routed to the agent deposit address.`;
    case "BUYBACK_EXECUTED":
      return `Buyback swap of ${row.amountSol.toFixed(4)} SOL executed on-chain.`;
    case "BURN_CONFIRMED":
      return `${row.amountToken.toLocaleString()} tokens burned and supply reduced.`;
    case "CONFIG_CHANGED":
      return "Agent configuration parameters changed on-chain.";
    case "FAILED_WINDOW":
      return "Reconciler flagged a buyback window with no confirmed burn.";
    case "ANOMALY_DETECTED":
      return "Indexer flagged this transaction for review.";
    case "OPERATOR_VERIFIED":
      return "Operator wallet signed an Ed25519 challenge for this agent.";
    case "SWAP_EXECUTED":
      return `DEX swap of ${row.amountSol.toFixed(4)} SOL net by the executor wallet.`;
    case "X402_PAYMENT_RECEIVED":
      return row.amountToken > 0
        ? `${(row.amountToken / 1_000_000).toFixed(2)} USDC received via x402 micropayment.`
        : `${row.amountSol.toFixed(4)} SOL received via x402 micropayment.`;
    case "TASK_COMPLETED":
      return "Agent completed a priced task attested on-chain.";
    case "OC_OPENED":
      return "Outcome Contract posted and escrow locked.";
    case "OC_AWARDED":
      return "Executor selected for the Outcome Contract.";
    case "OC_FULFILLED":
      return "Checkable outcome met with public Capsule evidence.";
    case "OC_FAILED":
      return "Outcome Contract missed, expired, or was rejected.";
    case "OC_SLASHED":
      return "Outcome Contract escrow was slashed.";
    // AEON primitives
    case "ESCROW_CREATED":
      return `AEON escrow locked for ${row.amountSol.toFixed(4)} SOL. Awaiting completion.`;
    case "ESCROW_RELEASED":
      return `Escrow successfully released. ${row.amountSol.toFixed(4)} SOL settled on-chain.`;
    case "ESCROW_CANCELED":
      return `Escrow canceled. Funds returned to depositor.`;
    case "BOND_DEPOSITED":
      return `Slashable bond of ${row.amountSol.toFixed(4)} SOL deposited by operator.`;
    case "BOND_SLASHED":
      return `Operator bond of ${row.amountSol.toFixed(4)} SOL slashed due to failed execution.`;
    case "RECEIPT_CREATED":
      return `AEON hash-chained receipt recorded. Execution attested on-chain.`;
    case "AEON_PAYMENT":
      return `AEON pay instruction settled ${row.amountToken.toLocaleString()} token units.`;
    case "AEON_AGENT_REGISTERED":
      return "Agent identity registered on the AEON program.";
    case "AEON_AUTHORITY_ISSUED":
      return "Spending authority issued on the AEON program.";
    case "AEON_AUTHORITY_REVOKED":
      return "Spending authority revoked on the AEON program.";
    case "AEON_AUTHORITY_EXPIRED":
      return "Spending authority expired on the AEON program.";
    case "AEON_ATOMIC_SPLIT":
      return "AEON atomic split executed.";
    case "AEON_ORG_CREATED":
      return "AEON organization created.";
    case "AEON_ORG_DEPOSIT":
      return "Tokens deposited to an AEON organization treasury.";
    case "AEON_ORG_SPLIT":
      return "AEON organization split executed.";
    case "AEON_ORG_DISSOLVED":
      return "AEON organization dissolved.";
    case "AEON_ORG_JOINED":
      return "Member joined an AEON organization.";
    case "AEON_ORG_SHARE_SET":
      return "AEON organization member share updated.";
    case "AEON_ORG_RESIDUAL_RECLAIMED":
      return "Residual AEON organization funds reclaimed.";
    case "AEON_PAUSE_SET":
      return "AEON scoped pause flag updated.";
    case "AEON_CONFIG_INITIALIZED":
      return "AEON program config initialized.";
    default:
      return "Decoded program event.";
  }
}

export function rowToAgentEvent(row: AgentEventRow): AgentEvent {
  const type = (KNOWN_EVENT_TYPES as string[]).includes(row.type as string)
    ? (row.type as EventType)
    : "ANOMALY_DETECTED";
  const severity = (KNOWN_SEVERITIES as string[]).includes(row.severity as string)
    ? (row.severity as Severity)
    : "info";
  return {
    id: row.id,
    type,
    severity,
    title: eventTitleFor(type),
    description: eventDescFor(row),
    signature: row.signature,
    amount: row.amountSol || undefined,
    tokenAmount: row.amountToken || undefined,
    slot: row.slot ?? 0,
    // Tier B (protocol-marker) x402 detection is self-asserted evidence, so it
    // is surfaced as medium confidence on the event row.
    confidence: row.detectionMethod === "memo_marker" ? "medium" : "high",
    facilitatorId: row.facilitatorId,
    occurredAt: relativeFromNow(row.occurredAt),
    iso: row.occurredAt,
  };
}

// Live agent_events are authoritative once present. The seeded jsonb is only
// shown when no live events have been indexed for this agent yet.
export function mergeEvents(live: AgentEventRow[], seeded: AgentEvent[]): AgentEvent[] {
  if (live.length === 0) return seeded;
  return live.map(rowToAgentEvent);
}

export const EVENT_ICON: Record<string, typeof Activity> = {
  DEPOSIT_RECEIVED: ArrowDownToLine,
  BUYBACK_EXECUTED: Repeat,
  BURN_CONFIRMED: Flame,
  CONFIG_CHANGED: Settings,
  FAILED_WINDOW: AlertTriangle,
  ANOMALY_DETECTED: AlertTriangle,
  OPERATOR_VERIFIED: ShieldCheck,
  SWAP_EXECUTED: Repeat,
  X402_PAYMENT_RECEIVED: ArrowDownToLine,
  TASK_COMPLETED: ShieldCheck,
  OC_OPENED: Activity,
  OC_AWARDED: ShieldCheck,
  OC_FULFILLED: ShieldCheck,
  OC_FAILED: AlertTriangle,
  OC_SLASHED: AlertTriangle,
  // AEON primitives
  ESCROW_CREATED: Activity,
  ESCROW_RELEASED: ShieldCheck,
  ESCROW_CANCELED: AlertTriangle,
  BOND_DEPOSITED: ShieldCheck,
  BOND_SLASHED: AlertTriangle,
  RECEIPT_CREATED: CheckCircle2,
  AEON_PAYMENT: ArrowDownToLine,
  AEON_AGENT_REGISTERED: ShieldCheck,
  AEON_AUTHORITY_ISSUED: ShieldCheck,
  AEON_AUTHORITY_REVOKED: AlertTriangle,
  AEON_AUTHORITY_EXPIRED: AlertTriangle,
  AEON_ATOMIC_SPLIT: Repeat,
  AEON_ORG_CREATED: Activity,
  AEON_ORG_DEPOSIT: ArrowDownToLine,
  AEON_ORG_SPLIT: Repeat,
  AEON_ORG_DISSOLVED: AlertTriangle,
  AEON_ORG_JOINED: ShieldCheck,
  AEON_ORG_SHARE_SET: Settings,
  AEON_ORG_RESIDUAL_RECLAIMED: ArrowDownToLine,
  AEON_PAUSE_SET: AlertTriangle,
  AEON_CONFIG_INITIALIZED: Settings,
};

export function shortMint(m: string) {
  return `${m.slice(0, 6)}…${m.slice(-6)}`;
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="focus-ring inline-flex items-center gap-1.5 border border-bronze/60 bg-panel-deep/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
    >
      {done ? <CheckCircle2 className="h-3 w-3 text-verified" /> : <Copy className="h-3 w-3" />}
      {label ?? (done ? "Copied" : "Copy")}
    </button>
  );
}

export type DossierFlags = {
  isTokenized: boolean;
  isTaskExecutor: boolean;
  isExecutor: boolean;
  isRegistered: boolean;
  hasAeonPrimitives: boolean;
};

export function dossierFlags(agent: Agent): DossierFlags {
  const hasAeonPrimitives =
    (agent.totalEscrowsCompleted ?? 0) > 0 ||
    (agent.activeBondAmount ?? 0) > 0 ||
    (agent.totalSlashedUsd ?? 0) > 0;
  return {
    isTokenized: agent.category === "tokenized_buyback",
    isTaskExecutor: agent.category === "task_executor",
    isExecutor: agent.identifierKind === "executor_wallet",
    isRegistered: agent.category === "registered_agent",
    hasAeonPrimitives,
  };
}

export function scorePillarsFor(agent: Agent, flags: DossierFlags) {
  if (flags.isTaskExecutor) {
    return [
      {
        pillar: "Outcome execution",
        hint: "Award density · fulfillment · on-time performance",
        value: agent.scoreBreakdown.escrowCompletion + agent.scoreBreakdown.slashableBond,
        max: 70,
        tone: "text-verified",
      },
      {
        pillar: "Reliability",
        hint: "Failures · slashes · evidence recency",
        value: agent.scoreBreakdown.failedTx + agent.scoreBreakdown.recency,
        max: 25,
        tone: "text-amber",
      },
      {
        pillar: "Verification",
        hint: "Public Capsule · operator signature",
        value: agent.scoreBreakdown.operator,
        max: 5,
        tone: "text-paper",
      },
    ];
  }
  if (flags.hasAeonPrimitives) {
    return [
      {
        pillar: "Escrow Completion",
        hint: "Successful escrow releases / total escrows",
        value: agent.scoreBreakdown.escrowCompletion,
        max: 40,
        tone: "text-verified",
      },
      {
        pillar: "Slashable Bond",
        hint: "Active bond amount · slashing history",
        value: agent.scoreBreakdown.slashableBond,
        max: 30,
        tone: "text-amber",
      },
      {
        pillar: "Reliability",
        hint: "Failed windows · failed escrows · recency",
        value: agent.scoreBreakdown.failedTx + agent.scoreBreakdown.recency,
        max: 25,
        tone: "text-amber",
      },
      {
        pillar: "Verification",
        hint: "Operator signature · on-chain identity",
        value: agent.scoreBreakdown.operator,
        max: 5,
        tone: "text-paper",
      },
    ];
  }
  return [
    {
      pillar: "Execution",
      hint: "Observed settlement work",
      value: agent.scoreBreakdown.escrowCompletion + agent.scoreBreakdown.slashableBond,
      max: 70,
      tone: "text-verified",
    },
    {
      pillar: "Reliability",
      hint: "Failed-window rate · indexing recency",
      value: agent.scoreBreakdown.failedTx + agent.scoreBreakdown.recency,
      max: 25,
      tone: "text-amber",
    },
    {
      pillar: "Identity",
      hint: "Operator signature",
      value: agent.scoreBreakdown.operator,
      max: 5,
      tone: "text-paper",
    },
  ];
}

/**
 * One sentence explaining the grade by naming the evidence class that is
 * missing. A grade is never a verdict on the operator — it is a statement
 * about what the chain has shown us so far.
 */
export function whyThisGrade(agent: Agent, flags: DossierFlags): string {
  const operatorNote = agent.operatorVerified
    ? ""
    : " The operator has not signed for this subject, so identity is unverified.";

  if (agent.withheldReason != null) {
    return `Grade withheld (${agent.withheldReason}). This is not an evidence-based grade; scoring resumes when the AEON pipeline is available.${operatorNote}`;
  }
  if (agent.grade == null) {
    return `Ungraded — not enough scored evidence yet.${operatorNote}`;
  }

  const scoredEvents =
    agent.totalDepositsCount +
    agent.totalBuybacksCount +
    agent.totalBurnsCount +
    (agent.totalEscrowsCompleted ?? 0) +
    (agent.totalEscrowsFailed ?? 0);

  const missing: string[] = [];
  if (flags.isTokenized) {
    if (agent.totalDepositsCount === 0) missing.push("revenue deposits");
    if (agent.totalBuybacksCount === 0) missing.push("executed buybacks");
    if (agent.totalBurnsCount === 0) missing.push("confirmed burns");
  } else if (flags.isTaskExecutor || flags.hasAeonPrimitives) {
    if ((agent.totalEscrowsCompleted ?? 0) === 0) missing.push("completed escrows");
    if ((agent.activeBondAmount ?? 0) === 0) missing.push("a slashable bond");
  } else if (scoredEvents === 0) {
    missing.push("settlement activity of any scored class");
  }

  if (missing.length === 0) {
    return `Graded ${agent.grade} on ${scoredEvents.toLocaleString()} scored on-chain event${
      scoredEvents === 1 ? "" : "s"
    }.${operatorNote}`;
  }
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  return `Graded ${agent.grade} because the ledger shows no ${list}. The grade moves when that evidence appears — nothing else moves it.${operatorNote}`;
}
