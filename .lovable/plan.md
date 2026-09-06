# The one product to launch: SPX402 Preflight — "Is this endpoint safe to pay?"

## What the research found

I audited our own code, every repo under Adaptive-Liquidity, and the current state of the agent-payment market.

**The market gap is unusually clean.** Independent audits published in August 2026 all landed on the same conclusion: the payment rail works, the trust layer does not. Roughly 38% of paid agent endpoints are dead. Five scam patterns keep recurring — the advertised price not matching the charged price, the receiving address changing between requests, receiving addresses that can never release funds, receivers with zero payment history, and services charging tens of dollars where rivals charge fractions of a cent. Payments are irreversible; there is no chargeback for a machine. Independent research on the same ecosystem concludes it "still needs a killer app," and that the killer app is the trust layer.

**The competition is thin.** Four public tools do endpoint checking today. Every one is a one-shot command-line checker with between 0 and 2 stars. None keep history, none actually buy anything, none verify the receiving wallet on-chain, none publish a public record, none can be asked by a buying agent at the moment of purchase.

**We already built almost all of it and never pointed it at this problem.** Confirmed in our code: a two-tier prober that first checks an endpoint for free and then actually pays it with real money and confirms delivery; independent on-chain payment verification that re-derives payments from the chain rather than trusting the caller; a full outcome taxonomy and divergence detector; three ways of rendering a grade card (page, image, share image); a live machine-readable server that agent runtimes can query; on-chain attestations so a grade can be verified without trusting us; and an evidence trail behind every claim.

We are one repositioning away from owning the exact thing the market says is missing.

## The product

**SPX402 Preflight.** Paste any paid agent endpoint. In seconds you get a public, permanent safety report card — free, no sign-up.

The card answers the one question that matters: *would a stranger's money be safe here?* It reports whether the endpoint is alive, whether the advertised price matches the charged price, whether the receiving wallet is stable across requests and has real payment history, whether the price is sane against comparable services, and whether the service actually delivers after being paid.

Three reasons this spreads on its own:

1. **Every operator wants their card to be green.** A shareable, permanent, public grade with an embeddable badge creates the same pressure a security score does. People post the good ones and fix the bad ones.
2. **The bad cards are the story.** A public index of dead and predatory endpoints is inherently newsworthy in a market where three separate audits just made headlines saying exactly that.
3. **Buying machines can ask it directly.** The same check is exposed as a tool any agent runtime can call before spending money — one line of setup, and an agent stops paying scams. That is a habit, not a visit.

## How it gets built

### Phase 1 — The free scanner (the viral surface)
- A `/preflight` page: one input, one button, a live result card. No account.
- Runs the free tier of the existing prober against the submitted endpoint and records the result permanently, so every scan builds the index rather than evaporating.
- Adds the specific checks the audits named that we do not yet run: advertised-vs-charged price, receiver stability across repeat requests, receiver on-chain payment history, price outlier detection, and the transport-negotiation failure that silently makes an endpoint unbuyable by standard clients.
- Result renders through the existing grade-card renderers, so it is instantly shareable and embeddable with no new design work.

### Phase 2 — The public index
- `/preflight` gets a companion index: every endpoint ever scanned, sorted by safety, filterable to "dead," "price mismatch," "unverified receiver."
- A permanent page per endpoint with full history, so a grade change is visible over time and links to the underlying evidence.
- Weekly "state of paid agent endpoints" numbers published from real scans — the recurring content engine.

### Phase 3 — The habit
- A `preflight` tool added to our existing machine-readable server so buying agents check before they pay.
- A one-command terminal check that prints the card, for operators who live in a terminal.
- An embeddable "verified safe" badge for operators — the same badge machinery we already ship.

### Phase 4 — The business behind the free thing
- Continuous monitoring and alerts on your own endpoints (we already deliver alerts by webhook, Slack and email).
- Paid deep verification: the tier that actually pays the endpoint and proves delivery end to end.
- On-chain attestation of a safety grade, so an endpoint can prove its record to a counterparty without trusting us.

## Deliberately not in scope

The sibling projects (the on-chain authority and bond program, the agent-computer hosting, the crew pages) are strong and connect naturally later — a safety grade gating how much budget an agent gets is the obvious sequel. None of it is needed to launch, and folding it in now would delay the one thing with a clear, empty, well-documented market.

Also out: the PvP game tie-in, and anything requiring the prober to spend real money by default. Free tier stays free and keyless.

## Technical notes

- Reuses `src/lib/prober/outcomes.ts` (challenge parsing, validation, outcome taxonomy, divergence) and `prober.server.ts`; new checks land as additional classifiers in the same module with golden tests.
- Receiver history and price verification reuse the on-chain verification path already proven in `src/lib/indexer/x402-middleware.ts`.
- Card rendering reuses `src/lib/grade-card.ts` plus the page, vector and image renderers unchanged; only the row set differs.
- New tables for scanned endpoints and scan history follow the existing pattern — grants, row-level security, public read-only views.
- The new tool slots into the existing server at `src/routes/api/public/mcp.ts` alongside the four tools already live.
- Scans are rate-limited per caller with the existing limiter; paid deep verification stays behind the existing payment middleware.

## Success test

A stranger pastes an endpoint, gets a card in under ten seconds, and shares it. An agent runtime can refuse to pay a flagged endpoint without any custom code. And the index has enough real scanned endpoints to publish a number no one else can publish.
