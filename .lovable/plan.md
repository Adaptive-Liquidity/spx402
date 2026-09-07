# SPX402 — final public release: AEON agents, SPX402 Wallet, evidence-based reputation

Institutional trust terminal. Nothing on screen is invented: every grade, wallet, verification, attestation and release status comes from the backend or renders as an explicit unknown state.

## What exists today (verified)

- `/build/register` is a single short form: category picker, one base58 address, optional notes, insert into `candidate_agents`.
- The `agents` table has grade, score, confidence, operator_verified, executor_wallet, aeon_cri_address, escrow/bond/receipt counters. It has **no** visibility, publication, legal-owner, income-wallet, treasury-wallet, custody-type or attestation-routing fields. `candidate_agents` has no ownership or privacy fields either.
- Public "x402" wording appears across the site — heaviest in the methodology page, agent dossier, homepage, developer docs, registry, pricing, disclaimer and register form.
- There is no `/aeon-agents`, `/corrections`, `/genesis-record`, wallets/income-routing page, or private agent workspace.

Because ownership, income routing and privacy have no storage today, a frontend alone cannot make them real. See the decision at the end.

## Language change (site-wide)

Public copy drops x402 entirely: **SPX402 Wallet**, agent payment wallet, income wallet, machine payments, payment executor. "Create or connect an SPX402 Wallet" — never "connect your x402 wallet". The only place x402 survives is the developer/API surface, as a technical note: "SPX402 Wallets can use x402-compatible payment rails internally. Users do not need to manage x402 directly." Internal code, decoders, table names, cron routes and the `.well-known` manifest keep their x402 identifiers — renaming those would break indexing.

## Positioning used everywhere

AEON proves who the agent is and what authority it has. The SPX402 Wallet lets it pay or get paid. SPX402 turns verified activity into public trust, score, grade and reputation.

AEON release status is never overclaimed: devnet / mainnet pending / mainnet live comes from the backend, and until it does the page says so.

## Homepage

In order: hero — "Agents can lie. Evidence can not." with the subheadline, Register an Agent / Explore the Registry, and "No hidden boosts. No seeded grades. No reputation without evidence." Then the major reveal section, "The first credit layer agents can actually earn," as a restrained four-beat sequence (identity, controlled authority, payment wallet, earned reputation) closing on "This is not a leaderboard for bots. It is infrastructure for accountable machine economies." Then the product thesis, the AEON Agents explainer, how SPX402 works, agent wallet + income routing, the evidence-floor model, a registry/leaderboard preview drawn from live data, trust and corrections, final CTA.

The hero dossier preview shows the real status vocabulary but is labelled a demo until backend data exists.

## Registration wizard

`/build/register` becomes a ten-step wizard — agent type, basics, AEON identity, SPX402 Wallet, ownership and income routing, operator verification, privacy and publication, disclosures, evidence/status preview, review and submit. Progress visible, steps revisitable, nothing submits until review. Recommended type is AEON + SPX402 Wallet Agent. New agents default to **Private**. Wallet creation copy states plainly: "Creating a wallet does not create a grade. Reputation comes only from verified evidence." Where an endpoint is not live (wallet creation, AEON identity minting, operator challenge), the step shows an honest pending-integration state — no invented address, balance or verification.

## New and updated pages

- **`/aeon-agents`** (new) — "AEON Agents are agents with receipts." What an AEON agent is, what the AEON Program does, why it matters, what SPX402 adds, and a backend-driven launch-status block.
- **`/corrections`** (new) — dated corrections, wrong and corrected grade both shown, decoder and scoring versions named, old attestation superseded not deleted, new attestation referencing the old.
- **`/genesis-record`** (new) — launch claim, subject identities, signature, attester key, relationships, trading policy, AEON disclosures, corrections and evidence-floor commitments. Unsigned reads "Waiting for signed Genesis Record".
- **`/dashboard/wallets`** (new) — Wallets & Income Routing: per agent, every wallet role, custody type, verification status, change-approval status. Never a private key.
- **`/dashboard/agents`** and a private agent workspace — setup progress, AEON identity, wallet, income routing, operator verification, evidence readiness, publication gate checklist, disclosures.
- **Registry / leaderboard** — public agents only; rows carry AEON status, wallet status, operator status, trust status, event count, observation window, issuer-interest and provisional markers on the row itself. Leaderboard empty state: "No agents qualify yet. SPX402 only ranks agents after verified evidence meets the public floor."
- **Agent dossier** — restructured as a credit dossier: summary, identity, ownership disclosure, wallet/payment, reputation, evidence, attestation, corrections, API.
- **Methodology** — adds AEON identity verification, SPX402 Wallet evidence, wallet ownership vs binding, evidence floor, provisional grades, the tracked/ungraded/provisional/graded definitions, issuer-interest policy, private vs public agents, corrections and supersession, versioning, bundle contents.
- **API/dossier docs** — full field list plus the single x402 developer note.

## Navigation

Public: Registry, Leaderboard, Register Agent, AEON Agents, Methodology, Corrections, Genesis Record, API. Signed in: My Agents, Wallets, Income Routing, Evidence, Attestations, Publication Queue, Settings. Primary CTA Register Agent, secondary Explore Registry. Existing URLs and redirects are preserved.

## Privacy safeguards

Private, draft, internal and archived agents are excluded from the registry, leaderboard, public API, sitemap, search, public evidence bundles and the Genesis Record — enforced by row-level database rules, not only by frontend filtering. No keys, seed phrases, secrets, admin notes or unpublished routing changes are ever rendered.

## Visual direction

Near-black background, charcoal panels, graphite cards, off-white type, muted steel borders, cold blue-gray accents; amber for provisional and warning, green for verified, red only for failure and correction; monospace for wallets, hashes, signatures and versions. No neon, no gradients, no particles, no fake metrics. Desktop and mobile both polished.

## Technical section

- New `src/lib/registration/`: wizard state machine, per-step zod schemas, the shared status vocabulary, and one typed client interface declaring every expected endpoint (wallet create/read, AEON identity submit/read, operator challenge issue/verify, registration submit, subject status, evidence bundle, attestation, corrections, Genesis Record) — stubbed with explicit "not yet returned" states until live.
- Components: `StatusChip`, `VisibilityBadge`, `OwnershipSummaryCard`, `IncomeRoutingCard`, `SPX402WalletCard`, `WalletAddress`, `WalletRoleTable`, `AgentRegistrationWizard` plus one component per step, `AEONIdentityPanel`, `VerificationRail`, `EvidenceCard`, `EvidenceTimeline`, `EvidenceFloorPanel`, `GradeBadge`, `ScoreBreakdown`, `AttestationPanel`, `IssuerInterestBadge`, `CorrectionHistory`, `RegistryTable`, `LeaderboardTable`, `PrivateAgentCard`, `PublicationGateChecklist`, `APIEndpointCard`, `WarningDisclosure`; reuse the existing empty-state and copy-to-clipboard components.
- Every truth-sensitive value is read or rendered unknown. No client-side derivation of verification, grade, score, provisional status, attestation, evidence, issuer interest, mainnet status or leaderboard qualification.
- Scoring, decoders, program IDs, `decoderLive` flags and API contracts are untouched.

## Decision needed: storage for the new registration facts

Ownership, income routing, visibility and publication have nowhere to live today. Two options:

1. **Recommended — add the storage in this build.** A migration adds an owner-scoped `agent_registrations` table (agent type, legal owner, wallet roles, custody type, income routing, visibility, publication status, disclosures) with row-level rules so only the owner reads their private rows and the public sees only published ones, plus grants. The wizard then genuinely saves, private stays private, and the dashboard is real.
2. **Frontend only.** The wizard collects everything and holds it in session state, and every ownership/privacy surface renders as a documented pending-backend state. Nothing persists until the backend team ships the tables.

Verification (AEON identity, wallet creation, operator signature, attestations, mainnet status) stays backend-dependent in both options.

## Sequence

1. Language sweep + status-chip vocabulary + navigation.
2. Homepage rebuild and the AEON Agents page.
3. Registration wizard.
4. Dashboard, wallets/income routing, private workspace.
5. Registry, leaderboard, dossier.
6. Methodology, Corrections, Genesis Record, API docs.
7. Mobile pass, privacy audit, final report.

## Final report will list

Pages changed, components created, routes added, copy updated, where x402 was removed vs retained, backend endpoints expected, placeholder states used, truth-sensitive fields still backend-dependent, privacy safeguards implemented, anything blocked, and the screens to review first.
