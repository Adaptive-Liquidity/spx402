// Wave 4 — versioned, public methodology.
//
// This page is a public commitment, not marketing. Downstream consumers
// (x402 Bazaar, ERC-8004 registries, agent runtimes, auditors) need to be
// able to read this page and understand exactly what each grade means,
// what blind spots exist, how false positives are handled, and what
// freshness guarantees we make. Bumping any model version requires a
// new entry in the SCHEMA_CHANGELOG below.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { Panel } from "@/components/spx/Panel";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — SPX402 reputation primitive" },
      {
        name: "description",
        content:
          "Versioned, public methodology for SPX402 execution reputation. Risk score, confidence model, event taxonomy, blind spots, false-positive policy, appeals, and schema changelog.",
      },
      { property: "og:title", content: "SPX402 Methodology — versioned & public" },
      {
        property: "og:description",
        content:
          "Risk score (0–100, → grade) and confidence (0–1) computed independently. Event taxonomy, parser versions, false-positive policy, appeals.",
      },
    ],
  }),
  component: MethodologyPage,
});

const RISK_INPUTS = [
  {
    label: "Deposit Consistency",
    weight: 20,
    body: "Density and regularity of confirmed deposits to the agent deposit address.",
  },
  {
    label: "Buyback Execution Rate",
    weight: 25,
    body: "Ratio of expected buyback windows that produced a confirmed buyback.",
  },
  {
    label: "Burn Confirmation Rate",
    weight: 20,
    body: "Ratio of buybacks that resulted in confirmed SPL Token burns.",
  },
  {
    label: "Failed / Errored Tx",
    weight: 15,
    body: "Inverse score for failed buyback or burn instructions in observed windows.",
  },
  {
    label: "Recency",
    weight: 10,
    body: "Time since the last successful execution. Decays with silence.",
  },
  {
    label: "Metadata",
    weight: 5,
    body: "Presence of skills.md and parseable metadata for the agent.",
  },
  {
    label: "Operator Verification",
    weight: 5,
    body: "Wallet signature confirmed against the on-chain creator record.",
  },
];

const TASK_EXECUTOR_RISK_INPUTS = [
  {
    slot: "Deposit Consistency",
    signal: "Award density",
    body: "Awarded contracts divided by 20, capped at 100%.",
  },
  {
    slot: "Buyback Execution Rate",
    signal: "Fulfillment rate",
    body: "Fulfilled contracts divided by awarded contracts.",
  },
  {
    slot: "Burn Confirmation Rate",
    signal: "On-time rate",
    body: "Fulfillments received by SPX no later than the OPENED producer-declared deadline plus a five-minute clock-skew allowance.",
  },
  {
    slot: "Failed / Errored Tx",
    signal: "Outcome failures",
    body: "Starts at 15 points; each failure costs 2 points and each slash costs 5.",
  },
  {
    slot: "Metadata",
    signal: "Public Capsule",
    body: "Presence of public Capsule evidence for a fulfilled outcome.",
  },
] as const;

const CONFIDENCE_INPUTS = [
  {
    label: "Evidence depth",
    body: "Log-scaled count of independently observed events.",
  },
  {
    label: "Observation window",
    body: "Days since the first event, capped at 90.",
  },
  {
    label: "Recency",
    body: "Decays from the most recent confirmed event.",
  },
  {
    label: "Parser coverage",
    body: "Fraction of expected event types observed for this agent's category.",
  },
  {
    label: "Failure-detector coverage",
    body: "Whether failure decoders are live for this agent's category. Without negative-event coverage, confidence is capped.",
  },
  {
    label: "Identity resolution strength",
    body: "How tightly the subject is anchored on-chain (mint, MPL Core asset, executor wallet, x402 endpoint owner).",
  },
  {
    label: "Data-source health",
    body: "Indexer lag and webhook uptime. Stale ingest reduces confidence even if events look clean.",
  },
  {
    label: "Unresolved anomalies",
    body: "Negative penalty for events flagged by the reconciler that the operator has not addressed.",
  },
];

const EVENT_TAXONOMY = [
  {
    type: "DEPOSIT_RECEIVED",
    severity: "info",
    body: "SOL/USDC deposited to the agent deposit address.",
  },
  {
    type: "BUYBACK_EXECUTED",
    severity: "success",
    body: "Confirmed buyback transaction routed via the declared liquidity venue.",
  },
  {
    type: "BURN_CONFIRMED",
    severity: "success",
    body: "SPL Token burn instruction confirmed on-chain.",
  },
  {
    type: "SWAP_EXECUTED",
    severity: "success",
    body: "Registered agent observed performing its declared swap operation.",
  },
  {
    type: "X402_PAYMENT_RECEIVED",
    severity: "success",
    body: "x402 endpoint settled a payment from a counterparty.",
  },
  { type: "OC_OPENED", severity: "info", body: "Outcome Contract posted and escrow locked." },
  {
    type: "OC_AWARDED",
    severity: "info",
    body: "Executor selected and bound to the Outcome Contract.",
  },
  {
    type: "OC_FULFILLED",
    severity: "success",
    body: "Checkable outcome met with public Capsule evidence.",
  },
  { type: "OC_FAILED", severity: "critical", body: "Outcome missed, expired, or was rejected." },
  { type: "OC_SLASHED", severity: "critical", body: "Outcome Contract escrow was slashed." },
  {
    type: "OPERATOR_VERIFIED",
    severity: "info",
    body: "Operator wallet signed the SPX402 challenge.",
  },
  {
    type: "CONFIG_CHANGED",
    severity: "warn",
    body: "Declared agent configuration (operator, executor, route, cadence) changed.",
  },
  {
    type: "FAILED_BUYBACK_WINDOW",
    severity: "critical",
    body: "A declared buyback window passed with deposits in scope but no confirmed buyback.",
  },
  {
    type: "PROMISED_BUYBACK_NOT_SETTLED",
    severity: "critical",
    body: "A DEPOSIT_RECEIVED was followed by an errored outflow transaction.",
  },
  {
    type: "X402_PAYMENT_REVERTED",
    severity: "critical",
    body: "An x402 settlement transaction errored after a quote was issued.",
  },
  {
    type: "WINDOW_MISSED",
    severity: "warn",
    body: "Generic missed-cadence event for agents with declared periodicity.",
  },
  {
    type: "FAILED_WINDOW",
    severity: "warn",
    body: "Legacy missed-window classification, retained for historical compatibility.",
  },
  {
    type: "ANOMALY_DETECTED",
    severity: "warn",
    body: "Reconciler observed an unexpected pattern requiring manual triage.",
  },
];

const GRADES = [
  { g: "SPX AAA", r: "90–100", t: "Flawless observable execution across the observation window." },
  { g: "SPX AA", r: "80–89", t: "Consistent execution with at most minor anomalies." },
  { g: "SPX A", r: "70–79", t: "Active and reliable, with some gaps." },
  { g: "SPX BBB", r: "60–69", t: "Functional but irregular." },
  { g: "SPX BB", r: "40–59", t: "Inconsistent. Monitor closely." },
  { g: "SPX B", r: "20–39", t: "Stale or degraded." },
  { g: "SPX D", r: "0–19", t: "Inactive, failing, or high-risk execution pattern." },
  { g: "SPX404", r: "n/a", t: "Subject not found, or insufficient evidence to grade." },
] as const;

const PARSER_VERSIONS = [
  { name: "Score model", value: "spx-score-v0.4.0" },
  { name: "Confidence model", value: "spx-confidence-v0.2.0" },
  { name: "Parser", value: "spx-parser-v0.2.0" },
  { name: "EVM parser (Base)", value: "spx-parser-v1.0.0-evm" },
  { name: "Facilitator registry", value: "spx-facilitators-v0.3.0" },
  { name: "Evidence schema", value: "spx.evidence.v1" },
  { name: "Outcome Contract evidence", value: "flok.oc-evidence.v2 (gated)" },
  { name: "Verified-list schema", value: "spx.verified.v1" },
];

// How an x402 settlement gets recognised. Ordered by strength of evidence.
const X402_DETECTION_TIERS = [
  {
    tier: "Tier A",
    name: "Facilitator fee-payer",
    confidence: "high",
    body: "The transaction fee-payer is an address in the SPX402 facilitator registry. Facilitators sponsor gas for x402 settlements, so their fee-payer slot is the strongest available proof that a transfer is a protocol settlement rather than an ordinary transfer. No memo required.",
  },
  {
    tier: "Tier B",
    name: "Protocol marker",
    confidence: "medium",
    body: "No registry facilitator is present, but the transaction carries an x402 memo or description marker. Markers are self-asserted by the payer or server, so these settlements are recorded at medium confidence and are capped in the confidence model.",
  },
  {
    tier: "Not detected",
    name: "Bare transfer",
    confidence: "—",
    body: "A transfer to an executor wallet with neither a registry fee-payer nor a protocol marker is not counted as an x402 settlement. SPX402 undercounts rather than guesses.",
  },
];

// Base / EVM lane. Deliberately asymmetric with Solana: Tier B on EVM is
// discovery-only and can never produce a scored event.
const X402_EVM_DETECTION_TIERS = [
  {
    tier: "Tier A",
    name: "Facilitator sender",
    confidence: "high",
    body: "The transaction sender (tx.from) is a Base address in the SPX402 facilitator registry, and the call is an EIP-3009 transferWithAuthorization or a Permit2 permitWitnessTransferFrom moving a settlement token. Scored.",
  },
  {
    tier: "Tier B",
    name: "EIP-3009 pattern",
    confidence: "low",
    body: "An EIP-3009 or Permit2 settlement shape from a sender outside the registry. Used for candidate discovery only: it is never written to the event ledger and can never influence a score. Most EIP-3009 traffic on Base is ordinary gasless payment, not x402.",
  },
  {
    tier: "Not detected",
    name: "Bare ERC-20 transfer",
    confidence: "—",
    body: "A plain transfer() with no authorization primitive is not a settlement candidate at all.",
  },
];

const BLIND_SPOTS = [
  "Custom buyback routes outside known IDLs may surface as low-confidence events.",
  "Off-chain revenue, service quality, and operator intent are unknowable to SPX402.",
  "Webhook delivery latency may delay event ingestion. Reconciliation runs every 60 seconds.",
  "x402 endpoints behind aggregators may be undercounted until the aggregator publishes settlement metadata.",
  "x402 settlements are undercounted for facilitators outside the registry: only operators that publish a fee-payer (cross-checked against their /supported endpoint and proven by a captured fixture) get Tier A detection; everything else relies on explicit protocol markers (Tier B).",
  "Base (EVM) x402 detection is live but the Base facilitator registry is empty, so the Base lane currently scores zero agents and reports discovery counts only.",
  "Solana and Base are indexed as independent lanes. SPX402 performs no cross-chain identity linking: a Solana subject and a Base subject are never merged, even if the same operator controls both.",
  "Outcome Contract deadlines are producer-declared, not independently chosen by SPX402. The deadline is hash-bound at OC_OPENED, must be echoed unchanged by OC_AWARDED, and is accepted only within the documented 30-day horizon.",
];

const SCHEMA_CHANGELOG = [
  {
    version: "flok.oc-evidence.v2",
    date: "2026-08-21",
    body: "Hard cutover for gated Outcome Contract ingest. OC_OPENED commits a producer-declared deadline, OC_AWARDED must echo it, and on-time fulfillment compares SPX server observation time with that deadline plus a five-minute clock-skew allowance. This does not mark the task-executor decoder LIVE.",
  },
  {
    version: "spx-score-v0.4.0",
    date: "2026-08-20",
    body: "Added dedicated Outcome Contract scoring for task executors. Award density, fulfillment, verifiable on-time performance, failures, and slashes now determine the execution score; grades are withheld unless awarded-contract, complete-window, and deadline evidence are present.",
  },
  {
    version: "spx-parser-v1.0.0-evm",
    date: "2026-08-02",
    body: "Base (EVM) settlement lane. EIP-3009 and Permit2 settlements on Base are decoded from an independent, cursor-resumable log scan. Tier A (registry sender) is scored; Tier B (pattern-only) is discovery-only and never enters the event ledger. Events carry a chain field; the score model is unchanged and remains chain-agnostic.",
  },
  {
    version: "spx-facilitators-v0.3.0",
    date: "2026-08-02",
    body: "Registry extended to EVM chains. Base facilitator rows are registered address-less and INACTIVE until an operator publishes a sender address and a captured fixture proves detection — the same activation guard applies to every chain.",
  },
  {
    version: "spx-parser-v0.2.0",
    date: "2026-08-01",
    body: "Tiered x402 detection. Tier A matches the transaction fee-payer against the facilitator registry (high confidence, no memo required); Tier B falls back to protocol markers (medium confidence). Settlement events now record facilitator_id, detection_method, and the payer wallet.",
  },
  {
    version: "spx-facilitators-v0.2.0",
    date: "2026-08-01",
    body: "Facilitator registry introduced. An address activates only when the operator publishes it and a captured settlement fixture proves detection — enforced in the database by an activation guard.",
  },
  {
    version: "spx-score-v0.3.0",
    date: "2026-04-27",
    body: "Decoupled risk score and confidence into independent pure functions. Removed grade_factor from confidence inputs.",
  },
  {
    version: "spx-confidence-v0.2.0",
    date: "2026-04-27",
    body: "Confidence model split out, capped when failure-detector coverage is missing for an agent's category.",
  },
  {
    version: "spx.evidence.v1",
    date: "2026-04-27",
    body: "Per-event Evidence Bundle endpoint published. Includes raw_tx_hash and decoded_by parser version.",
  },
  {
    version: "spx.verified.v1",
    date: "2026-04-27",
    body: "Public Verified API endpoint with category/grade/score/confidence filters and cursor pagination.",
  },
  {
    version: "spx-parser-v0.1.7",
    date: "2026-04-15",
    body: "Added registered-agent decoder (MPL Core) and x402 payment-revert detection.",
  },
];

function MethodologyPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">Methodology · spx-score-v0.4.0</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        Public, versioned methodology.
        <br />
        <span className="text-amber">Risk and confidence are computed separately.</span>
      </h1>
      <p className="mt-6 max-w-3xl text-lg text-paper-muted">
        SPX402 grades observable on-chain execution. This page is the contract between SPX and any
        downstream consumer — x402 Bazaar trust signals, ERC-8004 reputation feedback, attestation
        issuers, agent runtimes. Every model carries a version string baked into every score row and
        every evidence record. Changes are listed in the schema changelog at the bottom of this
        page.
      </p>

      {/* CURRENT VERSIONS */}
      <section className="mt-12">
        <Panel eyebrow="Current versions" title="What is in production today">
          <ul className="grid gap-3 sm:grid-cols-2">
            {PARSER_VERSIONS.map((v) => (
              <li
                key={v.name}
                className="flex items-baseline justify-between border-l-2 border-amber/60 bg-panel-deep/40 px-3 py-2"
              >
                <span className="text-sm text-paper-muted">{v.name}</span>
                <span className="font-mono text-sm text-paper">{v.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* TWO-AXIS MODEL */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">
          The two-axis model: risk × confidence
        </h2>
        <p className="mt-3 max-w-3xl text-paper-muted">
          A two-day-old agent with two confirmed buybacks may score 75 with a confidence of 0.18. A
          six-month-old agent with hundreds of confirmed buybacks and zero failures may score 92
          with a confidence of 0.91. Both are accurate. Filled grade badges denote high confidence
          (≥ 0.66). Outlined grade badges denote low/medium confidence — the score may be right, but
          the evidence is thin.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="panel-engraved p-5">
            <div className="label-mono text-amber">High confidence</div>
            <div className="mt-3">
              <ExecutionGradeBadge grade="SPX AA" confidenceScore={0.84} size="md" />
            </div>
            <p className="mt-3 text-sm text-paper-muted">
              Filled badge — observed long enough, decoded thoroughly, no unresolved anomalies.
            </p>
          </div>
          <div className="panel-engraved p-5">
            <div className="label-mono text-amber-dim">Low confidence</div>
            <div className="mt-3">
              <ExecutionGradeBadge grade="SPX AA" confidenceScore={0.22} size="md" />
            </div>
            <p className="mt-3 text-sm text-paper-muted">
              Outlined badge — score may be high but evidence is shallow. Treat with care until the
              observation window grows.
            </p>
          </div>
        </div>
      </section>

      {/* RISK SCORE FORMULA */}
      <section className="mt-12">
        <Panel eyebrow="Risk score · spx-score-v0.4.0" title="Σ weighted execution signals = 100">
          <div className="space-y-4">
            {RISK_INPUTS.map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-base font-semibold text-paper">{row.label}</div>
                  <div className="num-display text-amber">{row.weight}%</div>
                </div>
                <div className="mt-2 h-1 w-full bg-bronze-dim/60">
                  <div className="h-full bg-amber" style={{ width: `${row.weight * 4}%` }} />
                </div>
                <p className="mt-2 text-sm text-paper-muted">{row.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rule-bronze" />
          <p className="mt-5 font-mono text-sm text-paper">
            Σ = 100 points · Grade is assigned by the band the score falls in.
          </p>
          <div className="mt-6 border border-amber/50 bg-amber/5 p-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-amber">
              task_executor slot mapping
            </div>
            <p className="mt-2 text-sm text-paper-muted">
              Outcome Contract executors reuse the same weighted breakdown slots with
              category-specific signals. Recency and operator verification retain their standard
              meanings.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {TASK_EXECUTOR_RISK_INPUTS.map((row) => (
                <div key={row.slot} className="border-l-2 border-bronze/60 pl-3">
                  <dt className="font-mono text-xs text-paper">
                    {row.slot} → {row.signal}
                  </dt>
                  <dd className="mt-1 text-sm text-paper-muted">{row.body}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-paper-muted">
              A grade is withheld as <span className="font-mono text-paper">SPX404</span> unless
              award density, fulfillment rate, complete-window evidence, and verifiable on-time
              evidence are all present.
            </p>
            <p className="mt-3 text-sm text-paper-muted">
              Outcome Contract ingest accepts{" "}
              <span className="font-mono text-paper">flok.oc-evidence.v2</span> only. Deadlines are
              declared by the producer, hash-bound at{" "}
              <span className="font-mono text-paper">OC_OPENED</span>, and must be echoed unchanged
              by <span className="font-mono text-paper">OC_AWARDED</span>. SPX compares its
              server-observed receipt time to that deadline with a five-minute clock-skew grace.
              AWARDED and terminal events received before the corresponding OPENED commitment are
              rejected. Conflicting replays and duplicate contract events return HTTP 409. The
              decoder remains gated; this schema support is not a LIVE claim.
            </p>
          </div>
        </Panel>
      </section>

      {/* CONFIDENCE INPUTS */}
      <section className="mt-12">
        <Panel
          eyebrow="Confidence model · spx-confidence-v0.2.0"
          title="How much evidence supports the score (0..1)"
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {CONFIDENCE_INPUTS.map((c) => (
              <li key={c.label} className="border-l-2 border-bronze/60 pl-3">
                <div className="font-display text-sm font-semibold text-paper">{c.label}</div>
                <p className="mt-1 text-sm text-paper-muted">{c.body}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* GRADE TAXONOMY */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Grade taxonomy</h2>
        <div className="mt-6 overflow-hidden border border-bronze/50">
          {GRADES.map((g, i) => (
            <div
              key={g.g}
              className={`grid grid-cols-12 items-center gap-4 px-5 py-4 ${i % 2 ? "bg-panel" : "bg-background"}`}
            >
              <div className="col-span-5 sm:col-span-3">
                <ExecutionGradeBadge grade={g.g as "SPX AAA"} size="sm" />
              </div>
              <div className="col-span-3 sm:col-span-2 font-mono text-sm text-paper-muted">
                {g.r}
              </div>
              <div className="col-span-12 sm:col-span-7 text-sm text-paper">{g.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EVENT TAXONOMY */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Event taxonomy</h2>
        <p className="mt-2 max-w-3xl text-paper-muted">
          The registered taxonomy includes live and gated event types. Outcome Contract events
          remain gated while the task_executor decoder is disabled. Severity drives both the risk
          score and the failure-detector coverage signal that bounds confidence.
        </p>
        <div className="mt-6 overflow-hidden border border-bronze/50">
          <div className="grid grid-cols-12 gap-4 border-b border-bronze/40 bg-panel px-5 py-2 text-[10px] uppercase tracking-widest text-paper-muted">
            <div className="col-span-5">Type</div>
            <div className="col-span-2">Severity</div>
            <div className="col-span-5">Body</div>
          </div>
          {EVENT_TAXONOMY.map((e, i) => (
            <div
              key={e.type}
              className={`grid grid-cols-12 items-baseline gap-4 px-5 py-3 ${i % 2 ? "bg-panel" : "bg-background"}`}
            >
              <div className="col-span-5 font-mono text-xs text-paper">{e.type}</div>
              <div className={`col-span-2 font-mono text-xs ${severityClass(e.severity)}`}>
                {e.severity}
              </div>
              <div className="col-span-5 text-sm text-paper-muted">{e.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* X402 DETECTION TIERS */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">
          How SPX402 detects x402 settlements
        </h2>
        <p className="mt-2 max-w-3xl text-paper-muted">
          x402 settlements do not carry a single canonical on-chain signature. SPX402 therefore uses
          tiered detection and records which tier fired on every event, so any consumer can
          re-derive the strength of the evidence rather than trusting a boolean.
        </p>
        <div className="mt-6 overflow-hidden border border-bronze/50">
          <div className="grid grid-cols-12 gap-4 border-b border-bronze/40 bg-panel px-5 py-2 text-[10px] uppercase tracking-widest text-paper-muted">
            <div className="col-span-2">Tier</div>
            <div className="col-span-3">Signal</div>
            <div className="col-span-2">Confidence</div>
            <div className="col-span-5">Rule</div>
          </div>
          {X402_DETECTION_TIERS.map((t, i) => (
            <div
              key={t.tier}
              className={`grid grid-cols-12 items-baseline gap-4 px-5 py-3 ${i % 2 ? "bg-panel" : "bg-background"}`}
            >
              <div className="col-span-2 font-mono text-xs text-amber">{t.tier}</div>
              <div className="col-span-3 font-mono text-xs text-paper">{t.name}</div>
              <div
                className={`col-span-2 font-mono text-xs ${
                  t.confidence === "high"
                    ? "text-verified"
                    : t.confidence === "medium"
                      ? "text-amber"
                      : "text-wire"
                }`}
              >
                {t.confidence}
              </div>
              <div className="col-span-5 text-sm text-paper-muted">{t.body}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm text-paper-muted">
          The facilitator registry is published on the{" "}
          <a href="/status" className="text-amber underline underline-offset-4">
            status page
          </a>
          , including addresses that are tracked but not yet active. Every address is taken from the
          operator's own documentation and cross-checked against that operator's live{" "}
          <span className="font-mono text-paper">/supported</span> endpoint, which publishes each
          supported network alongside its{" "}
          <span className="font-mono text-paper">extra.feePayer</span>. An address becomes active
          only when both sources agree and a captured settlement fixture proves detection against
          it. SPX402 does not infer facilitator addresses from observed chain traffic, so the
          registry may legitimately be empty — in which case Tier A is dormant and x402 coverage is
          understated rather than fabricated.
        </p>

        {/* EVM / BASE SUBSECTION */}
        <h3 className="mt-10 font-display text-xl font-bold text-paper">
          Base (EVM) detection tiers
        </h3>
        <p className="mt-2 max-w-3xl text-sm text-paper-muted">
          Base settles x402 through EIP-3009{" "}
          <span className="font-mono text-paper">transferWithAuthorization</span> and Permit2{" "}
          <span className="font-mono text-paper">permitWitnessTransferFrom</span>, not memos.
          Because those primitives are also used by ordinary gasless payment flows, the Base lane is
          deliberately stricter than Solana: only a registry sender produces a scored event.
          Everything else is discovery.
        </p>
        <div className="mt-6 overflow-hidden border border-bronze/50">
          <div className="grid grid-cols-12 gap-4 border-b border-bronze/40 bg-panel px-5 py-2 text-[10px] uppercase tracking-widest text-paper-muted">
            <div className="col-span-2">Tier</div>
            <div className="col-span-3">Signal</div>
            <div className="col-span-2">Confidence</div>
            <div className="col-span-5">Rule</div>
          </div>
          {X402_EVM_DETECTION_TIERS.map((t, i) => (
            <div
              key={t.tier}
              className={`grid grid-cols-12 items-baseline gap-4 px-5 py-3 ${i % 2 ? "bg-panel" : "bg-background"}`}
            >
              <div className="col-span-2 font-mono text-xs text-amber">{t.tier}</div>
              <div className="col-span-3 font-mono text-xs text-paper">{t.name}</div>
              <div
                className={`col-span-2 font-mono text-xs ${
                  t.confidence === "high"
                    ? "text-verified"
                    : t.confidence === "low"
                      ? "text-wire"
                      : "text-wire"
                }`}
              >
                {t.confidence}
              </div>
              <div className="col-span-5 text-sm text-paper-muted">{t.body}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm text-paper-muted">
          The Base lane is currently in <span className="text-amber">report-only</span> mode:
          detection runs on every scanned block, but no Base facilitator sender has been published
          and fixture-verified, so the Base registry is empty and zero Base agents are scored.
          Solana and Base are scanned by independent cursors and are never merged into a single
          identity.
        </p>
      </section>

      {/* ACTIVE VERIFICATION — the prober lane. */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Active verification</h2>
        <p className="mt-3 max-w-3xl text-paper-muted">
          Passive indexing can only see payments that happened. It cannot see a service that
          advertises a price and never settles, returns a malformed challenge, takes payment and
          delivers nothing, or points its{" "}
          <code className="font-mono text-xs text-paper">payTo</code> at a wallet that does not
          match its dossier. To measure those, SPX402 acts as a paying customer: it requests the
          resource, validates the challenge, pays the advertised amount, and records what came back.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="panel-engraved p-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-wire">
              What a probe measures
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-paper-muted">
              <li>Challenge validity — is the 402 body well-formed and priced?</li>
              <li>
                Config drift — does <code className="font-mono text-xs">payTo</code> match the
                wallet in the dossier?
              </li>
              <li>Settlement rate — does the payment actually settle?</li>
              <li>Verify and settle latency, in milliseconds.</li>
              <li>Delivery — did the paid response contain a resource?</li>
            </ul>
          </div>
          <div className="panel-engraved p-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-wire">
              Rules the prober operates under
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-paper-muted">
              <li>
                No covert probing. Every request carries{" "}
                <code className="font-mono text-xs text-paper">User-Agent: SPX402-Probe/1.0</code>.
              </li>
              <li>Hard caps: $0.05 per probe, $10 per UTC day, no retries.</li>
              <li>
                A budget breaker (<code className="font-mono text-xs">PROBER_BUDGET_HALT</code>) and
                a wallet-drain tripwire suspend paid probes automatically.
              </li>
              <li>
                Every payment the prober makes is reconstructible from published probe rows plus
                on-chain data — the prober is audited by the same pipeline it feeds.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 border border-amber/60 bg-amber/10 p-5">
          <div className="font-mono text-[11px] uppercase tracking-widest text-amber">
            Probe data is not yet scored
          </div>
          <p className="mt-2 text-sm text-paper">
            In this release, active-verification results are{" "}
            <strong>collected and displayed only</strong>. No probe outcome contributes to an SPX
            Execution Score, grade, or confidence value. Scores computed before this lane existed
            are byte-identical to scores computed after it.
          </p>
        </div>

        <div className="mt-5 panel-engraved p-5">
          <div className="font-mono text-[11px] uppercase tracking-widest text-wire">
            Prober wallets
          </div>
          <p className="mt-2 text-sm text-paper-muted">
            Every payment SPX402 makes is attributable to a published wallet, so operators can
            distinguish probe traffic from organic demand. The prober is currently{" "}
            <strong className="text-paper">disabled and unfunded</strong>; its Solana and Base
            addresses will be published here, and on{" "}
            <Link to="/status" className="text-amber hover:underline">
              /status
            </Link>
            , before the first paid probe is executed.
          </p>
          <dl className="mt-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between border-b border-bronze/30 pb-1.5">
              <dt className="uppercase tracking-widest text-wire">Solana</dt>
              <dd className="text-paper-muted">not yet provisioned</dd>
            </div>
            <div className="flex justify-between border-b border-bronze/30 pb-1.5">
              <dt className="uppercase tracking-widest text-wire">Base</dt>
              <dd className="text-paper-muted">not yet provisioned</dd>
            </div>
          </dl>
        </div>

        <p className="mt-4 max-w-3xl text-sm text-paper-muted">
          A future release may introduce a{" "}
          <code className="font-mono text-xs text-paper">PROBE_DIVERGENCE</code> signal — flagged
          when a service's settle rate for SPX402 probes exceeds its organic settle rate by more
          than 25 points over at least 14 days, which is what selective service looks like from the
          outside. The predicate is implemented and unit-tested today; it is not wired to scoring.
        </p>
      </section>

      {/* WHAT WE REFUSE TO MEASURE */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">
          What SPX402 refuses to measure
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            "Token price",
            "Expected return",
            "Social momentum",
            "Meme quality",
            "Celebrity endorsement",
            "Holder count",
            "Vibes",
            "Future buyback promises",
          ].map((x) => (
            <li
              key={x}
              className="border-l-2 border-critical/70 bg-panel-deep/40 px-4 py-2 font-mono text-sm text-paper-muted"
            >
              <span className="mr-2 text-critical">✕</span> {x}
            </li>
          ))}
        </ul>
      </section>

      {/* BLIND SPOTS */}
      <section className="mt-12 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">Known blind spots</h2>
        <ul className="mt-4 space-y-3 text-sm text-paper-muted">
          {BLIND_SPOTS.map((b, i) => (
            <li key={i} className="border-l-2 border-amber-dim/60 pl-3">
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* FALSE POSITIVE POLICY */}
      <section className="mt-8 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">False-positive policy</h2>
        <p className="mt-3 max-w-3xl text-paper-muted">
          A false positive is any event SPX402 classified at{" "}
          <span className="font-mono text-paper">critical</span> severity that was, on review, not a
          failure of the agent's declared duty. SPX maintains a rolling sample audit and publishes
          the observed false-positive rate. Bonded reputation (Wave 6+) will not ship to mainnet
          until the audited rate is at or below 2%. Score recalculations are deterministic and
          replayable from the underlying event log — when a false positive is confirmed, the
          offending event is reclassified and downstream scores rebuild from evidence, not from a
          manual override.
        </p>
      </section>

      {/* APPEALS */}
      <section className="mt-8 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">Appeals & dispute window</h2>
        <p className="mt-3 max-w-3xl text-paper-muted">
          Operators may submit a verification signature plus a parser-fixture link via the operator
          dashboard. For bonded agents (Wave 6+), there is a minimum{" "}
          <span className="font-mono text-paper">72-hour</span> grace window between a
          critical-severity event and any slash submission, and a minimum{" "}
          <span className="font-mono text-paper">7-day</span> public dispute window codified before
          any mainnet slash is submitted. These windows exist so that decoder bugs, indexer outages,
          and operator rectifications can never produce an unappealable financial outcome.
        </p>
      </section>

      {/* FRESHNESS SLA */}
      <section className="mt-8 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">Freshness SLA</h2>
        <ul className="mt-4 space-y-2 text-sm text-paper-muted">
          <li>
            <span className="font-mono text-paper">Webhook ingest</span> — typically &lt; 30 seconds
            from on-chain confirmation.
          </li>
          <li>
            <span className="font-mono text-paper">Failure reconciler</span> — runs every 10
            minutes.
          </li>
          <li>
            <span className="font-mono text-paper">Score & grade</span> — recomputed on the scoring
            cron and on relevant event arrival.
          </li>
          <li>
            <span className="font-mono text-paper">Score snapshots</span> — captured daily at 00:05
            UTC.
          </li>
          <li>
            <span className="font-mono text-paper">/api/public/verified</span> — edge-cached with{" "}
            <span className="font-mono">s-maxage=300, stale-while-revalidate=3600</span>.
          </li>
          <li>
            <span className="font-mono text-paper">/api/public/evidence/&lt;event&gt;</span> —
            immutable rows, edge-cached for 1 hour.
          </li>
          <li>
            The{" "}
            <Link to="/status" className="text-amber hover:underline">
              /status
            </Link>{" "}
            page exposes per-decoder lag so consumers can distinguish "no failures observed" from
            "decoder is broken."
          </li>
        </ul>
      </section>

      {/* RETROACTIVE SCORING POLICY */}
      <section className="mt-8 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">Retroactive scoring policy</h2>
        <p className="mt-3 max-w-3xl text-paper-muted">
          When a model version is bumped, all scores recompute from the event log under the new
          model. Snapshots taken before the bump retain their original{" "}
          <span className="font-mono text-paper">methodology_version</span> tag — they are not
          rewritten. Attestations issued under an older model remain valid until expiry, but their{" "}
          <span className="font-mono text-paper">methodology.score_model</span> field carries the
          version they were issued under. Consumers SHOULD prefer the newest attestation when models
          diverge.
        </p>
      </section>

      {/* WHY SPX CAN DOWNGRADE ITSELF */}
      <section className="mt-8 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">
          Why SPX402 can downgrade itself
        </h2>
        <p className="mt-3 max-w-3xl text-paper-muted">
          SPX402's own tokenized agent is scored by the same methodology as every other tracked
          agent. If our buybacks fail or our operator stops signing, the grade drops. The trust
          layer dies the moment the rater grants itself an exception.
        </p>
      </section>

      {/* DATA SOURCES */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Data sources</h2>
        <ul className="mt-4 space-y-3 text-paper-muted">
          <li className="border-l-2 border-amber/60 pl-3">
            <span className="font-mono text-paper">Helius webhooks</span> — live on-chain event
            delivery, with idempotent reconciliation against duplicate retries.
          </li>
          <li className="border-l-2 border-amber/60 pl-3">
            <span className="font-mono text-paper">Raw transaction backfill</span> — reconciled
            against decoded instructions for missed events.
          </li>
          <li className="border-l-2 border-amber/60 pl-3">
            <span className="font-mono text-paper">Pump &amp; PumpSwap IDLs</span> — canonical
            instruction decoding from the official public IDL repository.
          </li>
          <li className="border-l-2 border-amber/60 pl-3">
            <span className="font-mono text-paper">SPL Token burn detection</span> — direct on-chain
            confirmation, not log parsing.
          </li>
          <li className="border-l-2 border-amber/60 pl-3">
            <span className="font-mono text-paper">Manual fixture validation</span> — every parser
            version is regression-tested against a corpus of real transactions.
          </li>
        </ul>
      </section>

      {/* SCHEMA CHANGELOG */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Schema changelog</h2>
        <p className="mt-2 max-w-3xl text-paper-muted">
          Every model and schema version that has shipped. Bumps land here before they propagate to{" "}
          <span className="font-mono">methodology_version</span>,
          <span className="font-mono"> confidence_model_version</span>, and
          <span className="font-mono"> parser_version</span> on the relevant rows.
        </p>
        <div className="mt-6 overflow-hidden border border-bronze/50">
          {SCHEMA_CHANGELOG.map((c, i) => (
            <div
              key={c.version + c.date}
              className={`grid grid-cols-12 gap-4 px-5 py-4 ${i % 2 ? "bg-panel" : "bg-background"}`}
            >
              <div className="col-span-12 sm:col-span-3 font-mono text-xs text-amber">
                {c.version}
              </div>
              <div className="col-span-12 sm:col-span-2 font-mono text-xs text-paper-muted">
                {c.date}
              </div>
              <div className="col-span-12 sm:col-span-7 text-sm text-paper">{c.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MACHINE-READABLE LINKS */}
      <section className="mt-12 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">Machine-readable surfaces</h2>
        <ul className="mt-4 space-y-2 font-mono text-sm text-paper">
          <li>
            <span className="text-paper-muted">GET</span> <code>/api/public/verified</code> —
            paginated list, filterable by category/grade/score/confidence.
          </li>
          <li>
            <span className="text-paper-muted">GET</span>{" "}
            <code>/api/public/evidence/&lt;event_id&gt;</code> — per-event Evidence Bundle.
          </li>
          <li>
            <span className="text-paper-muted">GET</span>{" "}
            <code>/api/public/agent/&lt;subject&gt;/evidence</code> — subject-level Merkle bundle.
          </li>
          <li>
            <span className="text-paper-muted">GET</span>{" "}
            <code>/api/public/badge/&lt;mint&gt;.svg</code> — embeddable SVG badge.
          </li>
          <li>
            <span className="text-paper-muted">GET</span> <code>/embed/&lt;subject&gt;</code> —
            iframe-friendly widget.
          </li>
        </ul>
      </section>
    </div>
  );
}

function severityClass(s: string): string {
  if (s === "success") return "text-verified";
  if (s === "critical") return "text-critical";
  if (s === "warn") return "text-amber-dim";
  return "text-paper-muted";
}
