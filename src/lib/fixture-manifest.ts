// GENERATED FILE — do not edit by hand.
// Regenerate with: bun scripts/gen-fixture-manifest.ts
//
// Every decoder claim on /methodology is pinned to one of these captured
// mainnet transactions. A SKIPPED entry is an honest gap, never a silent pass.

export interface FixtureManifestEntry {
  id: string;
  section: string;
  chain: string;
  captured: boolean;
  capturedAt: string | null;
  signature: string | null;
  parserVersionIntroduced: string;
  skipReason: string | null;
}

export const FIXTURE_MANIFEST: FixtureManifestEntry[] = [
  {
    "id": "A1_deposit_native_sol",
    "section": "A · Tokenized buyback lane (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "No tracked tokenized agent currently has a non-null deposit_address, so no real deposit tx exists to capture."
  },
  {
    "id": "A2_buyback_pumpfun",
    "section": "A · Tokenized buyback lane (Solana)",
    "chain": "solana",
    "captured": true,
    "capturedAt": "2026-08-01T00:00:37.606Z",
    "signature": "4z2jZZwLhPBkjevfNADaPFeKHQtfUAPsX2dNTndTrXbSG2Gdo6ZevqjD6bHAdvKRcNQwBH5VuBYGsdiiWEc44G8L",
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": null
  },
  {
    "id": "A3_burn_confirmed",
    "section": "A · Tokenized buyback lane (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "Awaiting verbatim capture; no burn observed for the two live indexed agents in the recent window."
  },
  {
    "id": "A4_burn_token2022",
    "section": "A · Tokenized buyback lane (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "No Token-2022 agent is currently indexed; nothing on-chain to capture."
  },
  {
    "id": "A5_buyback_and_burn_same_tx",
    "section": "A · Tokenized buyback lane (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "Awaiting verbatim capture; not observed for live indexed agents."
  },
  {
    "id": "A6_failed_pumpfun_tx",
    "section": "A · Tokenized buyback lane (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "Awaiting verbatim capture of a failed buyback tx."
  },
  {
    "id": "A7_unrelated_tx_no_events",
    "section": "A · Tokenized buyback lane (Solana)",
    "chain": "solana",
    "captured": true,
    "capturedAt": "2026-08-01T00:00:37.904Z",
    "signature": "3tKr9rBF2G4TreVbqzbwpH5UEfSgbEoxfLJMCq4WfraTyHvktUVALT3MgipmtRsQn9ktQ4rj7fAFXQifBBvdKB9d",
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": null
  },
  {
    "id": "A8_multi_agent_single_tx",
    "section": "A · Tokenized buyback lane (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "Requires two agents with deposit addresses; not present in production data."
  },
  {
    "id": "B1_x402_sol_receipt",
    "section": "B · x402 settlement (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "Zero x402 executors are indexed in production; facilitator-registry detection ships in the Facilitator Registry Detection Patch."
  },
  {
    "id": "B4_transfer_no_marker",
    "section": "B · x402 settlement (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "Zero x402 executors are indexed in production."
  },
  {
    "id": "B5_x402_marker_wrong_recipient",
    "section": "B · x402 settlement (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "Zero x402 executors are indexed in production."
  },
  {
    "id": "B6_x402_reverted",
    "section": "B · x402 settlement (Solana)",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "Zero x402 executors are indexed in production."
  },
  {
    "id": "C1_jupiter_swap",
    "section": "C · Negative controls",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "No executor wallets are indexed yet, so no swap tx can be attributed to a tracked wallet."
  },
  {
    "id": "C2_raydium_swap",
    "section": "C · Negative controls",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "No executor wallets are indexed yet."
  },
  {
    "id": "C3_non_dex_transfer",
    "section": "C · Negative controls",
    "chain": "solana",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "spx-decoder-v1",
    "skipReason": "No executor wallets are indexed yet."
  },
  {
    "id": "E1_facilitator_transfer_with_authorization",
    "section": "E · x402 settlement (Base/EVM)",
    "chain": "base",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "v1.0.0-evm",
    "skipReason": "No Base facilitator sender address is published-and-verified yet. cdp-base and payai-base are registered address-less and INACTIVE; the lane ships report-only. Capture once an operator publishes a Base sender: bun scripts/capture-fixture.ts --chain base --id E1_facilitator_transfer_with_authorization --signature 0x..."
  },
  {
    "id": "E2_permit2_witness_settlement",
    "section": "E · x402 settlement (Base/EVM)",
    "chain": "base",
    "captured": false,
    "capturedAt": null,
    "signature": null,
    "parserVersionIntroduced": "v1.0.0-evm",
    "skipReason": "Depends on E1: no Base facilitator is active, so no registry-sender Permit2 settlement can be attributed. The Permit2 selector is derived from the canonical ABI at build time and stays UNPINNED until this fixture is captured."
  },
  {
    "id": "E3_eip3009_non_registry_sender",
    "section": "E · x402 settlement (Base/EVM)",
    "chain": "base",
    "captured": true,
    "capturedAt": "2026-08-01T01:18:47.663Z",
    "signature": "0xdd6cdaa042253d227fcb6b1ecbb2a6ee976e418b3f0a55cb625089cac938566a",
    "parserVersionIntroduced": "v1.0.0-evm",
    "skipReason": null
  },
  {
    "id": "E4_plain_usdc_transfer",
    "section": "E · x402 settlement (Base/EVM)",
    "chain": "base",
    "captured": true,
    "capturedAt": "2026-08-01T01:18:47.942Z",
    "signature": "0xeb729c5bdc80abe8f91ce035fd2e642bffafc6df8726ad9301aa4356a339b528",
    "parserVersionIntroduced": "v1.0.0-evm",
    "skipReason": null
  },
  {
    "id": "x402-facilitator-settlement-01",
    "section": "F · Facilitator registry captures",
    "chain": "solana",
    "captured": true,
    "capturedAt": "2026-08-01T00:42:14.624Z",
    "signature": "5C4AUZEZeYPpwpjRsZWpmG3cxBhdiq5NtdHmt8YPUaXUpnwnELfbZHgUc9g9GNghHopmzsr4ZB8Q1kTWUq9YB2JF",
    "parserVersionIntroduced": "v0.2.0",
    "skipReason": null
  },
  {
    "id": "x402-facilitator-settlement-02",
    "section": "F · Facilitator registry captures",
    "chain": "solana",
    "captured": true,
    "capturedAt": "2026-08-01T00:42:33.456Z",
    "signature": "2V6r5myBt1iEYpLbaQbwGLc7iprxiQ4NLdabyRC9zxAmx9pio8BaTutfKd1Y2pPMeCs43P42ZCc7zrPUVM7gtkJ2",
    "parserVersionIntroduced": "v0.2.0",
    "skipReason": null
  }
];

export interface FixtureSectionSummary {
  section: string;
  total: number;
  captured: number;
  skipped: number;
  lastCaptureAt: string | null;
}

export function fixtureSections(): FixtureSectionSummary[] {
  const map = new Map<string, FixtureSectionSummary>();
  for (const f of FIXTURE_MANIFEST) {
    const s = map.get(f.section) ?? {
      section: f.section,
      total: 0,
      captured: 0,
      skipped: 0,
      lastCaptureAt: null,
    };
    s.total += 1;
    if (f.captured) s.captured += 1;
    else s.skipped += 1;
    if (f.capturedAt && (!s.lastCaptureAt || f.capturedAt > s.lastCaptureAt)) {
      s.lastCaptureAt = f.capturedAt;
    }
    map.set(f.section, s);
  }
  return Array.from(map.values()).sort((a, b) => a.section.localeCompare(b.section));
}

export function fixtureTotals(): { total: number; captured: number; lastCaptureAt: string | null } {
  const captured = FIXTURE_MANIFEST.filter((f) => f.captured).length;
  const last = FIXTURE_MANIFEST.map((f) => f.capturedAt).filter(Boolean).sort();
  return {
    total: FIXTURE_MANIFEST.length,
    captured,
    lastCaptureAt: last.length > 0 ? (last[last.length - 1] as string) : null,
  };
}
