## Goal

Implement `SPX402_Decoder_Fixture_Suite_Design` exactly: test infrastructure, the full synthetic scoring golden suite, fixture-driven decoder tests structured so verbatim captures drop in, the local capture tool, and CI. No decoder logic changes.

## 1. Tooling

- `bun add -d vitest` (Vitest + the already-present `vite-tsconfig-paths`).
- `package.json`: add exactly one script — `"test": "vitest run"`. No other script touched.
- `vitest.config.ts` at root: node environment, `tsconfigPaths()` so `@/` resolves, include `src/**/__tests__/**/*.test.ts`.

## 2. Directories

```text
src/lib/indexer/__tests__/
  scoring.golden.test.ts        (section F — full, passing now)
  decode-tokenized.test.ts      (A1–A8)
  decode-x402.test.ts           (B1–B6)
  decode-swap.test.ts           (C1–C3)
  decode-registered-agent.test.ts (D1–D2)
  verifier.test.ts              (E1–E4, fetch stubbed at boundary)
  fixtures.ts                   (loader + envelope types + skip handling)
src/lib/indexer/__fixtures__/
  <id>.json                     (one file per case)
```

`fixtures.ts` exports `loadFixture(id)` and `describeFixture(id, fn)`. The envelope is mandatory and typed:
`{ _fixture: { id, capturedAt, signature, slot, capturedBy, parserVersionIntroduced, expected, notes, status? }, tx }`.
A fixture whose envelope has `status: "SKIPPED"` with a `skipReason` and no `tx` causes the test to register as `test.skip` with the reason printed — never a silent pass, never a fabricated `tx`.

## 3. Section F — synthetic scoring goldens (built fully, no captures)

Against `src/lib/indexer/scoring.server.ts` (unchanged):

- Grade boundary sweep at totals 89/90, 79/80, 69/70, 59/60, 49/50, 39/40 — inputs constructed to land on each exact total, asserting the grade flips at the documented threshold.
- SPX404 per branch: tokenized (all counters zero), x402 (`count === 0`), registered (`!registryProof && swapCount === 0`).
- Fee-buyback auto-detect: `deposits=0, buybacks=3` flips the branch; `buybacks=2` does not (asserted via the differing breakdown/verdict).
- Recency window edges: `lastIndexedSeconds` exactly at 6h (short window) and 7d (long window), plus one second either side.
- Regression pin: a canonical synthetic input per branch → full `ScoreResult` object via `toMatchInlineSnapshot`, so any scoring change forces a reviewable diff.

## 4. Sections A–E — test bodies now, captures dropped in later

Each case gets its test written against the real decoder with the doc's assertions (`decodeTx`, `decodeX402Tx`, `decodeSwapTx`, `diffRegisteredAgent`, verifier with `fetch` stubbed). Fixture files are created as envelope-only SKIPPED stubs carrying `expected` and `skipReason` until a real capture lands. Assertions are written to the doc's strictness and will not be softened.

Capture attempt: if `HELIUS_API_KEY` is reachable in this environment, I will run the capture script against the tx history of the two live indexed agents and fill whichever of A1–A8 / C1–C3 real transactions actually exist. Anything not found on-chain stays SKIPPED with a reason. B1–B6 (x402 facilitator cases) and D1–D2 are expected to remain SKIPPED going into the second doc's patch, which ships them as its acceptance criteria.

## 5. `scripts/capture-fixture.ts`

Local-only Bun script per section 6: `--signature`, `--id`, `--expect` (JSON), optional `--notes`. Reads `HELIUS_API_KEY` from `process.env` (never hardcoded, never in CI), fetches the Enhanced Transactions API, writes `src/lib/indexer/__fixtures__/<id>.json` with the verbatim `tx` under the `_fixture` envelope, then runs the relevant test once.

## 6. CI

`.github/workflows/fixtures.yml` verbatim from the doc: `name: decoder-fixtures`, `on: [push]`, ubuntu-latest, checkout@v4, setup-node@v4 (node 22, npm cache), `npm ci`, `npm test`. No secrets.

## 7. Out of scope for this prompt

No decoder behavior changes, no `PARSER_VERSION` constant additions, no `/status` fixture-coverage panel, no methodology governance copy, and nothing from the facilitator patch doc — those are governance/second-prompt items.

## Deliverable report

Full `vitest run` output with pass/skip counts and an explicit list of fixture IDs still needing real captures.
