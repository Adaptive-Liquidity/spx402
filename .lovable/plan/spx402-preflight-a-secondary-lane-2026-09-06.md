# SPX402 Preflight — a secondary lane

## What this is, and what it is not

The primary live product does not change. The Pump buyback grade card at `/agent/:mint` stays the homepage story. Hero, homepage headline, pricing copy and the dossier copy are untouched by this work.

Preflight is a second, smaller lane: paste a paid-endpoint URL, and we record and publish exactly what happened when we called it.

The card answers one question, in these words: **"What did this endpoint do when we called it?"** It never says "safe to pay," never says "verified safe," and never calls anything a scam or a honeypot.

## Honest framing

There are already live products doing endpoint checking — vet402, x402 Trust, x402 Doctor, ScoutScore, ResolveBots, gold-402, AgentTrust, and Coinbase's own validate endpoint. Some of them do more than we would in Phase 1, including real paid buys and public tables. This lane is not a land-grab and is not positioned as one. It is a modest, honest addition that reuses prober code we already wrote, and it earns its place only if the records it publishes are accurate and clearly scoped.

What we can genuinely offer: every scan is persisted with its evidence and its date, the result is readable by a machine through the tool server we already run, and we describe observations rather than verdicts.

## Current state, verified

- Prober code exists (`src/lib/prober/outcomes.ts`, `prober.server.ts`, `config.server.ts`) but the lane is disabled and unfunded. `roadmap.md` still lists "Prober: funded wallet + PROBER_ENABLED=true" as open. With the flag off, only free challenge probes run — paid delivery proof is not live. Probe data is displayed, never scored.
- The tool server at `src/routes/api/public/mcp.ts` exposes exactly four tools: `spx_list_verified_agents`, `spx_get_agent_grade`, `spx_get_tape`, `spx_list_facilitators`. None is a preflight tool.
- `src/lib/indexer/x402-middleware.ts` is our sell-side payment gate for our own paid API. It is not a buyer-side oracle for a stranger's receiving address and will not be repurposed as one.
- On-chain attestation of an endpoint record is not shipped and is not in Phases 1–3.

## Phase 1 — the only thing built now

A new route `/preflight`: one URL input, one button, no account.

It runs the existing **free challenge tier only**. `PROBER_ENABLED` stays false; nothing here spends money.

Every scan is persisted — new tables with grants, row-level security and public read-only views, following the same pattern already used for probe runs — so the record survives the page view.

Checks permitted in Phase 1:

1. Reachable, and returns HTTP 402.
2. The challenge parses: version, accepts list, network, asset, payTo, required amount.
3. The challenge is requested a second time; we record whether the price and the payTo were the same across the two calls. A difference is labelled **"quote changed"** — never "scam," never "honeypot." A changing address is a fact we report, not a verdict; legitimate services rotate them.
4. Optional: listed price against category peers, reported as **"outlier vs sample"** with the sample size and the date attached. Never "predatory," never "gouging."
5. A transport or version mismatch that would stop a standard client from paying — only if it is already detectable in the existing outcome classifier.

Explicitly forbidden in Phase 1: advertised-versus-charged price (requires a real payment), receiving-address on-chain history used as a trust signal, any claim that the service delivers after payment, and the words "verified safe."

Copy rules throughout: "observed," "NONE" for absent facts, the scan timestamp always visible, and the probe kind stated as `challenge`. No "safe," no "audit," no borrowed statistics.

**A new card model** — `PreflightCardModel` — for endpoint rows. The existing `GradeCardModel` is a Pump mint card (ticker, last buyback, last burn) and endpoint facts do not belong in it. Preflight reuses the shared colours, the font, and the vector and image pipelines; it does not call `buildGradeCard()`.

## Phase 2 — after Phase 1 is live and real rows exist

- A `/preflight` index of scanned URLs, filterable by outcome: dead, no-402, quote-changed, parse-fail.
- A per-endpoint history page linking to the stored evidence for each scan.
- Periodic numbers drawn only from our own scans, always published with the sample size and the date. No claims of uniqueness.

## Phase 3

- A fifth tool on the existing server, `spx_preflight_endpoint({ url })`, returning the last challenge result as JSON. The four existing tools are untouched.
- Optionally a one-command terminal check printing the same JSON. No badge, no "verified safe."

## Phase 4 — blocked

Blocked until `PROBER_ENABLED=true` and funded Solana and Base prober wallets are published on `/methodology`.

- Paid deep probe: pay at most $0.05, confirm delivery, write a probe run.
- Alerts on an operator's own endpoints, reusing the existing alert channels.
- On-chain attestation of a **challenge record** — not of a "safety grade."

## Out of scope

AEON, Floks, the crew pages, and the PvP experiment are all out of this change.

## Success test

- A stranger pastes a URL and gets a card in under ten seconds listing which checks ran and when the scan happened.
- An agent can call `spx_preflight_endpoint` and decline on explicit outcomes — `no_402`, unreachable, parse failure — rather than on a "safe" boolean.
- The Pump `/agent/:mint` cards still work and remain the homepage story.
