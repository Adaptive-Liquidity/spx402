# Audit + Tier 4 — fill the instrument

## What the audit found

The build is healthy. Typecheck clean, 207 tests passing, no security-scan findings, every scheduled job running on time with no failures in the last 3 days. Tiers 1–3 did what they promised: the terminal looks and reads like an institutional instrument, and it is now machine-readable (`/llms.txt`, `/.well-known/agent-card.json`, MCP, verifiable badges).

The problem is no longer the software. It is what the software is looking at.

| Signal | Now |
| --- | --- |
| Agents tracked | 660 |
| Grades issued | 660 — but 647 are SPX D, 12 SPX404, **1** SPX B |
| Evidence events | 357, newest **2 days old** |
| x402 services in the registry | **0** |
| Recorded probes | **0** |
| x402 payments observed | **0** |
| Operator accounts / API keys / badge subscribers | 6 / 0 / 0 |
| Base (EVM) lane | last 401s from the RPC key in early Sept; no events since |

So: the pipeline runs every five minutes and finds nothing. The leaderboard is one row deep, the tape is stale, the prober has never actually shopped anybody, and nothing on the paid side has ever been sold. Every remaining problem is a **supply** problem (not enough real agent activity flowing in) or an **activation** problem (nobody has a reason to sign up yet).

## Tier 4 — make the instrument observe, and make operators show up

Same design lock: no palette, type, hero copy, scoring or pricing changes.

### 1. Coverage: get real activity into the tape
- Audit each lane end to end against a live transaction and record why it is returning nothing: Solana x402 scan, Base/EVM scan, registry scan, backfill. Fix the Base RPC credential and add a startup credential check so a 401 surfaces as a loud status, not a silent zero.
- Widen the discovery surface: import known x402 service directories and facilitator endpoints on a schedule rather than one-off scripts, so the service registry stops being empty.
- Add a "lane liveness" contract: each lane declares its expected cadence, and the status page shows OBSERVING / QUIET / STALLED per lane with the last real (non-empty) result. A lane that finds zero for longer than its cadence is stalled, and says so.

### 2. Turn the prober on for real
- Run the Mystery Shopper against the live facilitators on a budget, record every probe, and let probe results feed grades exactly as specified. Zero recorded probes today means the active lane is theory.
- Publish a probe log page: who was shopped, what we paid, what came back, verdict — the strongest single piece of proof the terminal produces.

### 3. Fix the grade distribution honestly
- 98% SPX D almost certainly means the evidence floor is not reachable with the data we ingest, not that 647 agents are bad. Diagnose whether that is correct-and-honest (thin evidence → thin grade) or a scoring input that never arrives, and publish the answer on the methodology page either way.
- Add a per-agent "why this grade" line naming the missing evidence class, so a D is actionable rather than a verdict.

### 4. Activation loop for operators
- Self-serve claim: an operator lands on their own dossier, proves wallet control, and gets monitoring + badge + alerts in one flow, without contacting us.
- Free-to-watch, paid-to-prove: watching stays free; the badge, attestation and alerts are the paid surface (pricing unchanged).
- Outbound proof: for the agents already indexed, generate a shareable "you are being graded" card so the first touch is evidence, not a pitch.

### 5. Prove our own receipts
- Public traction dashboard (already scoped in the Base plan): calls served, USDC collected, active payers. We grade others on receipts; ours should be public and currently read zero — which is fine, and honest, as a starting line.

## Verification
Per item: `bun run typecheck && bun run test`, plus a live check that the lane in question produced a real row (not just a successful empty run). Tier 4 closes only when the tape has fresh events, the registry is non-empty, at least one probe is recorded, and one operator has completed self-serve claim end to end.

## Out of scope
No restyle. No scoring-formula change without publishing it. No seeded, simulated or off-chain-sourced rows anywhere — an empty state stays empty until real evidence arrives.
