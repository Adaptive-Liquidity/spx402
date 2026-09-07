# One-stop-shop agent registration + honest status surfaces

Front-end build only. The backend owns every fact; this plan owns the experience: the wizard, the forms, the pages, the status displays and the wiring. Nothing in here invents a verification, an event count, a grade, an attestation or a leaderboard position.

## The idea in one paragraph, in the words we'll use on the site

**AEON proves who the agent is and what it did. x402 proves it can pay or get paid. SPX402 turns that into public trust — score, grade, evidence, API data, reputation.** AEON agent = the agent's real identity and work record. x402 wallet = the agent's payment account. SPX402 = the credit bureau for agents. SPX402.com is the front door for all three.

## What exists today

`/build/register` is a single short form: pick one of seven categories, paste one base58 address, optional notes, insert a pending candidate row. No wallet flow, no identity fields, no operator signing, no disclosures, no status readout. Registry rows show grade, score and a few counters — no provisional or tracked marker, no issuer-interest mark. There is no Corrections Policy page and no Genesis Record page.

## The registration wizard

`/build/register` becomes an eight-step wizard. Progress is visible, steps are revisitable, nothing submits until review.

1. **Agent type** — six cards, one line each: AEON Agent, x402 Agent, **AEON + x402 Agent** (recommended, visually primary), Tokenized Agent, Existing Solana Agent, Outcome/Receipt Agent. The recommended card reads: "Register a real agent identity, connect its payment wallet, prove operator control, and build SPX402 reputation from verified evidence."
2. **Agent basics** — name, short description, website/profile (optional), category, network/ecosystem, public contact (optional).
3. **AEON identity** — CRI/identity address, executor wallet, controller/authority wallet, program address when required. Helper copy explains it's the durable on-chain identity. Renders one of: not connected / pending verification / verified / verification failed — all from the backend.
4. **x402 wallet** — three routes: use existing, create new, connect external. States: missing / pending / connected / verification failed. Copy: "This wallet is where your agent sends or receives machine-native payments." And the line that has to be there: **"Creating a wallet does not create a grade. Grades come only from decoded activity and the public scoring methodology."** If the create-wallet endpoint isn't live, the step shows an honest pending-integration state — no invented address, no fake balance.
5. **Operator verification** — request a challenge, sign it in the wallet, submit the signature. States: unverified / signature requested / signature submitted / verified / failed. Copy: "Verified status is earned by signature, not manually assigned."
6. **Disclosures** — the nine questions: do you operate this agent; financial interest; token now or planned; do you hold or trade any token connected to this subject; issuer-operated counterparty; independent counterparty; does the issuer operate the rails this subject uses; does that program have upgrade authority; who controls it. Copy: "Disclosures do not prevent registration. They make the reputation record honest."
7. **Evidence / status preview** — backend-returned only: tracked but ungraded, waiting for evidence, provisional, graded, verification failed, waiting for observation window, waiting for evidence floor. Renders decoded event count, observation window, evidence-floor status, last indexed transaction, evidence-bundle status, grade, score, attestation status — each shown only if the backend returns it, otherwise an explicit "not yet returned".
8. **Review and submit** — everything on one screen including disclosures and the expected post-submit status, then submit to the registration endpoint and route to the public agent page or a pending-status page.

## Status chips

One shared component, one vocabulary, used identically on wizard, agent page, registry and leaderboard: Tracked, Ungraded, Waiting for Evidence, Provisional, Graded, Operator Verified, Operator Unverified, x402 Connected, x402 Missing, AEON Verified, AEON Unverified, Issuer Interest, Attestation Pending, Attested, Superseded, Correction Published. Unverified never borrows the styling of verified; provisional never borrows the styling of graded.

## Public agent page

Adds registration status, operator verification, AEON identity status, x402 wallet status, decoded event count, observation window, evidence-floor status, the tracked/ungraded/provisional/graded state, grade and score only when the backend returns them, the issuer-interest mark, counterparty labels, and links to the evidence bundle, the attestation, the correction history and the API dossier.

## Registry and leaderboard rows

Rows carry grade/score when available, plus **Provisional** when below the evidence floor, **Tracked but ungraded** when registered without enough evidence, event count, observation window, issuer-interest marker, operator-verified marker and attestation marker. The provisional marker sits on the row itself — a disclosure that lives one click behind a visible grade isn't functioning as a disclosure.

## Pages

- **Methodology** — new sections: evidence floor, provisional grades, decoded-event requirements, observation window, scoring version, decoder version, issuer-interest policy, and the definitions of tracked / ungraded / provisional / graded.
- **Corrections Policy** (new page) — every correction dated; wrong grade and corrected grade both shown; decoder and scoring versions named; the old attestation superseded rather than deleted; the new attestation references the old; the correction links to both.
- **Genesis Record** (new page) — launch claim, subject identities, signature, public key, attester key, operational relationship, financial/token relationship, trading policy, AEON operator disclosure, AEON upgrade-authority disclosure, corrections commitment, evidence-floor commitment. Until the backend serves a signed record, the page reads "waiting for signed record" — it does not display an unsigned one.

## Technical section

- New `src/lib/registration/` module: the wizard state machine, the step schemas (zod), the shared status vocabulary, and a typed client interface with every expected endpoint declared in one file, documented for the backend team.
- Endpoints the frontend will call (documented as the contract, stubbed until live): create/connect x402 wallet and read its state; submit and read AEON identity verification state; issue and verify the operator challenge; submit the registration; read registration/evidence status for a subject; read agent status, evidence bundle, attestation and correction history; read the Genesis Record.
- New components: `RegistrationWizard` plus one component per step, `StatusChip`, `AgentStatusPanel`, `DisclosurePanel`, `EvidenceStatePanel`, and row markers wired into `AgentRow`.
- Every truth-sensitive value is read from the backend or rendered as an explicit unknown state. No client-side derivation of verification, grade, score, provisional status, attestation, evidence, issuer interest or leaderboard qualification.
- Existing routes, redirects, palette, typography and copy voice unchanged. `/register` keeps redirecting to `/build/register`.

## Final report will list

Pages changed, components added, endpoints expected, placeholder states used, and anything that could not be safely built without backend support.
