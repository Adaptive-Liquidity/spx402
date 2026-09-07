// Single source of truth for the /methodology page's structured copy.
// The page renders these verbatim and /llms-full.txt is generated from the
// same constants — one wording, no drift. Browser-safe: pure data.

export const RISK_INPUTS = [
  {
    label: "Escrow Completion Rate",
    weight: 40,
    body: "Escrows released against a receipt divided by all escrows the agent accepted.",
  },
  {
    label: "Active Slashable Bond",
    weight: 30,
    body: "Capital currently at risk behind the agent's promises, reduced by every dollar previously slashed.",
  },
  {
    label: "Failed / Errored Tx",
    weight: 15,
    body: "Inverse score for failed escrows and errored execution transactions in observed windows.",
  },
  {
    label: "Recency",
    weight: 10,
    body: "Time since the last successful execution. Decays with silence.",
  },
  {
    label: "Operator Verification",
    weight: 5,
    body: "Wallet signature confirmed against the on-chain identity record.",
  },
];

export const TASK_EXECUTOR_RISK_INPUTS = [
  {
    slot: "Escrow Completion Rate",
    signal: "Award density",
    body: "Awarded contracts divided by 20, capped at 100%.",
  },
  {
    slot: "Active Slashable Bond",
    signal: "Fulfillment rate",
    body: "Fulfilled contracts divided by awarded contracts.",
  },
  {
    slot: "Failed / Errored Tx",
    signal: "Outcome failures",
    body: "Starts at 15 points; each failure costs 2 points and each slash costs 5.",
  },
] as const;

export const CONFIDENCE_INPUTS = [
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

export const EVENT_TAXONOMY = [
  {
    type: "ESCROW_CREATED",
    severity: "info",
    body: "A payer locked funds on-chain for a priced unit of agent work.",
  },
  {
    type: "ESCROW_RELEASED",
    severity: "success",
    body: "Escrow released to the agent against a hash-chained receipt of delivery.",
  },
  {
    type: "ESCROW_CANCELED",
    severity: "critical",
    body: "Escrow closed without delivery. Counted as a failed escrow.",
  },
  {
    type: "BOND_DEPOSITED",
    severity: "success",
    body: "Operator posted slashable capital behind the agent's promises.",
  },
  {
    type: "BOND_SLASHED",
    severity: "critical",
    body: "Bonded capital was taken after a failure. Permanent negative evidence.",
  },
  {
    type: "RECEIPT_CREATED",
    severity: "info",
    body: "Hash-chained receipt appended to the agent's execution log.",
  },
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

export const GRADES = [
  { g: "SPX AAA", r: "90–100", t: "Flawless observable execution across the observation window." },
  { g: "SPX AA", r: "80–89", t: "Consistent execution with at most minor anomalies." },
  { g: "SPX A", r: "70–79", t: "Active and reliable, with some gaps." },
  { g: "SPX BBB", r: "60–69", t: "Functional but irregular." },
  { g: "SPX BB", r: "40–59", t: "Inconsistent. Monitor closely." },
  { g: "SPX B", r: "20–39", t: "Stale or degraded." },
  { g: "SPX D", r: "0–19", t: "Inactive, failing, or high-risk execution pattern." },
  { g: "SPX404", r: "n/a", t: "Subject not found, or insufficient evidence to grade." },
] as const;

export const PARSER_VERSIONS = [
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
export const X402_DETECTION_TIERS = [
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
export const X402_EVM_DETECTION_TIERS = [
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

export const BLIND_SPOTS = [
  "Custom buyback routes outside known IDLs may surface as low-confidence events.",
  "Off-chain revenue, service quality, and operator intent are unknowable to SPX402.",
  "Webhook delivery latency may delay event ingestion. Reconciliation runs every 60 seconds.",
  "x402 endpoints behind aggregators may be undercounted until the aggregator publishes settlement metadata.",
  "x402 settlements are undercounted for facilitators outside the registry: only operators that publish a fee-payer (cross-checked against their /supported endpoint and proven by a captured fixture) get Tier A detection; everything else relies on explicit protocol markers (Tier B).",
  "Base (EVM) x402 detection is live but the Base facilitator registry is empty, so the Base lane currently scores zero agents and reports discovery counts only.",
  "Solana and Base are indexed as independent lanes. SPX402 performs no cross-chain identity linking: a Solana subject and a Base subject are never merged, even if the same operator controls both.",
  "Outcome Contract deadlines are producer-declared, not independently chosen by SPX402. The deadline is hash-bound at OC_OPENED, must be echoed unchanged by OC_AWARDED, and is accepted only within the documented 30-day horizon.",
];

export const SCHEMA_CHANGELOG = [
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

export const REFUSES_TO_MEASURE = [
  "Token price",
  "Expected return",
  "Social momentum",
  "Meme quality",
  "Celebrity endorsement",
  "Holder count",
  "Vibes",
  "Future revenue promises",
];
