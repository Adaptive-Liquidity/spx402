# First live AEON + SPX402 agents on mainnet

Goal: put our own agents on the terminal as the first officially graded, operator-verified mainnet subjects — through the exact same pipeline any outside agent goes through, no shortcuts and no seeded rows.

## Where things actually stand

Checked against the live database and the code:

- There are **no AEON agents at all** today. The whole database is 646 registered agents, 12 tokenized, 2 x402 executors — all Solana.
- The AEON scoring branch, the agent page cards and the alert toggles are all built and waiting.
- **The AEON decoder cannot decode anything yet.** The instruction fingerprints in `decode-aeon.server.ts` are placeholder values, not the real ones from the deployed program. Any real AEON transaction would be silently ignored.
- **Nothing is listening to the AEON program.** Our on-chain listener only watches agent addresses and Pump. AEON activity never reaches us.
- **The verifier has no AEON path.** A submitted AEON wallet gets checked for swaps and x402 payments, finds none, and is rejected.

So this is not a data-entry task. Three plumbing gaps have to close before a single real grade can exist.

## What I need from you

1. The **deployed AEON program address on mainnet**. Fingerprints get derived from the canonical on-chain interface record (or a verified build) — not from a file passed around in chat.
2. The **AEON agent's identity address (CRI)** and its **executor wallet**.
3. The **SPX402 agent's own address** — I expect this is our x402 receiving wallet, since that is the service we actually run and get paid on. Confirm or give me a different one.
4. Whichever wallet you'll **sign the operator challenge with**, per agent.
5. **Do we operate the AEON program itself?** If yes, that gets disclosed too: the issuer operates the rails its own subject transacts on.
6. **Is there a counterparty we don't control** who can take the other side of at least one escrow? (See blocker 1.)
7. **Does either agent have, or plan, a token?** And do we hold or trade any token of any graded subject? (See blocker 2.)

If any of these agents have not transacted on mainnet yet, that's fine — the plan below covers going live.

## Launch blockers

These four gate the launch. None of them are optional, and none of them ship after the fact.

**1. Counterparty independence, or say plainly that we don't have it.**
If the bond, the escrow-to-release and the receipt all run between wallets we control, the events are real but economically circular — the agent-economy version of wash volume. Preference: route at least one escrow through a counterparty we don't control. If that isn't possible yet, the evidence bundle and the agent page state it in plain words: escrow counterparty is issuer-operated; the grade reflects protocol mechanics, not market-validated usage. Every counterparty relationship is labelled in the published evidence. Nobody discovers this after us.

**2. The Genesis Record covers money, not just operations.**
It states whether the issuer holds or trades any token associated with any graded subject, starting with its own, and states our policy on trading around grade changes for our own agents. "We hold nothing, and if that changes it will be said here" is a strong position; silence is the weak one.

**3. Precise wording on the claim.**
Not "subject #1 and #2" — the registry already holds 646 subjects. The claim is **"AEON subjects #1 and #2 — the first operator-verified, graded mainnet subjects on SPX402."** Precise costs nothing and can't be picked apart.

**4. A written, public corrections policy, before the first grade.**
Our two agents will be graded by brand-new decoder, listener and verifier code. The likely first outcome is that we mis-grade ourselves in public. That's fine — better us than an outsider — but only if corrections are versioned and published the same way grade drops are. The Genesis Record carries that commitment next to "if our grade drops, it drops in public," and every correction gets a dated entry naming the decoder version that caused it.


## Plan

### 1. Make the AEON decoder real
Derive the true instruction fingerprints from the canonical on-chain interface record (or a verified build) and replace the placeholders. Add golden tests built from real captured mainnet transactions of each kind — escrow created, released, canceled, bond deposited, bond slashed, receipt created — same fixture discipline as the existing decoders. Fixture transaction signatures are committed to the repo and carried in the evidence bundle, pinned to the decoder commit that produced them, so re-derivation is actually reproducible rather than theoretically reproducible. Parse real amounts from the transaction's transfers instead of returning zero.

### 2. Start listening to AEON
Add the AEON program address to the on-chain listener subscription so every AEON transaction reaches the pipeline, and add each agent's identity address alongside it. Backfill runs through the ordinary decode-then-score path — no bulk insert, no shortcut route, including under deadline.

### 3. Teach the verifier about AEON
Add an AEON branch: a candidate passes when its identity address exists on-chain under the AEON program and it has at least one decoded escrow, bond or receipt. That is a listing bar, not a grading bar — see the thin-evidence guard in step 7.

### 4. Go live on-chain (if not already)
If these agents haven't executed yet, we make them execute for real: post a bond, run at least one escrow through to release, emit a receipt. Blocker 1 applies — at least one escrow crosses a counterparty we don't control, or the circularity is disclosed on the agent page and in the evidence bundle before the grade is shown anywhere.

### 5. Register through the front door
Submit both agents on `/build/register` like any operator would, let the verifier promote them, let the scoring sweep grade them. Then sign the operator challenge with each wallet so the VERIFIED chip is earned, not set.

### 6. Publish the proof
Once graded: mint the on-chain attestation for each grade (the attester wallet is already live), and publish the evidence bundle — including counterparty labels, fixture signatures and decoder commit — so anyone can independently re-derive the score.

### 7. Show it the way a serious issuer would
Both agents rank normally in the registry and leaderboard — no boosting, no pinning above better subjects. Around that:

- **The Genesis Record** — a dated, signed, permanent entry: AEON subjects #1 and #2, the first operator-verified graded mainnet subjects on SPX402, rated under the same methodology and the same public evidence as everyone else. It states our operational relationship to each subject (including whether we operate the AEON rails themselves), our financial interest and trading policy, the commitment that a drop in our own grade drops in public, and the commitment that every correction is versioned and published.
- **Issuer-interest mark as standing policy** — any subject where SPX402 has operational or financial interest carries the mark, automatically, forever, no exceptions. Written into the methodology page as policy, not applied as a one-off to these two.
- **Thin-evidence guard** — before launch I check what a single escrow actually produces. A confident-looking letter grade off one event is misleading no matter how honest the plumbing, so the agent page shows event count and observation window next to the grade, and a subject below the evidence floor reads as provisional rather than established.

## Notes

- Nothing is seeded. If step 4 hasn't happened, both agents show as tracked-but-ungraded until real activity lands — an honestly empty grade is better for a ratings platform than a fast one.
- No changes to scoring weights, grade thresholds, palette, typography or existing copy.
- Launch gate: blockers 1–4 answered in public copy; decoder tests green against real captured transactions; both agents graded from indexed events; both operator-signed; attestations live on-chain.

