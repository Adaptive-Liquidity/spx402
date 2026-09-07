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

1. The **deployed AEON program address on mainnet** and its interface file (IDL). This is the one hard blocker — the real instruction fingerprints are derived from it.
2. The **AEON agent's identity address (CRI)** and its **executor wallet**.
3. The **SPX402 agent's own address** — I expect this is our x402 receiving wallet, since that is the service we actually run and get paid on. Confirm or give me a different one.
4. Whichever wallet you'll **sign the operator challenge with**, per agent.

If any of these agents have not transacted on mainnet yet, that's fine — the plan below covers going live.

## Plan

### 1. Make the AEON decoder real
Derive the true instruction fingerprints from the deployed program's interface file and replace the placeholders. Add golden tests built from a captured real mainnet transaction of each kind (escrow created, escrow released, escrow canceled, bond deposited, bond slashed, receipt created) — same fixture discipline as the existing decoders. Also parse real amounts from the transaction's transfers instead of returning zero.

### 2. Start listening to AEON
Add the AEON program address to the on-chain listener subscription so every AEON transaction reaches the pipeline, and add each agent's identity address alongside it. Backfill the agent's history so the grade reflects everything it has already done, not just what happens after we switch on.

### 3. Teach the verifier about AEON
Add an AEON branch: a candidate passes when its identity address exists on-chain under the AEON program and it has at least one decoded escrow, bond or receipt. Wire it into the same candidate queue everything else uses.

### 4. Go live on-chain (if not already)
If these agents haven't executed yet, we make them execute for real: post a bond, run at least one escrow through to release, and emit a receipt. That is the honest path to a grade — the score has to come from work that happened.

### 5. Register through the front door
Submit both agents on `/build/register` like any operator would, let the verifier promote them, let the scoring sweep grade them. Then sign the operator challenge with each wallet so the VERIFIED chip is earned, not set.

### 6. Publish the proof
Once graded: mint the on-chain attestation for each grade (the attester wallet is already live), and publish the evidence bundle so anyone can independently re-derive the score.

### 7. Show it the way a serious issuer would
Both agents rank normally in the registry and leaderboard — no boosting, no pinning above better subjects. On top of that, a small permanent **Genesis Record**: a dated, signed entry stating that SPX402 registered its own agents as subject #1 and #2 under the same methodology, with the same public evidence, and holds no exemption from its own grades — including the commitment that if our own grade drops, it drops in public. Each of our agent pages carries a discreet "Issuer's own subject" mark so nobody can claim we hid the relationship. This is the credibility move: a ratings business is only worth anything if it is willing to be rated by its own rules first.

## Notes

- Nothing is seeded. If step 4 hasn't happened, both agents show as tracked-but-ungraded until real activity lands — that stays honest and is itself a demonstration.
- No changes to scoring weights, grade thresholds, palette, typography or existing copy.
- Verification gate: decoder tests green against real captured transactions, both agents graded from indexed events, both operator-signed, attestations live on-chain.
