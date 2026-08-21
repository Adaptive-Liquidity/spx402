// Single source of truth for SPX402 agent categories and identifier kinds.
// Adding a category? Update CATEGORIES, the type union, and the DB CHECK
// constraint in the migration.

export type IdentifierKind = "mint" | "core_asset" | "executor_wallet";

export type AgentCategory =
  | "tokenized_buyback"
  | "registered_agent"
  | "x402_executor"
  | "copy_trader"
  | "task_executor"
  | "general";

export interface CategoryMeta {
  id: AgentCategory;
  label: string;          // short label for tabs / chips
  longLabel: string;      // full descriptive name
  blurb: string;          // 1-line description for tab bodies
  identifierKind: IdentifierKind; // primary identifier kind for this category
  identifierLabel: string;        // "Mint", "MPL Core Asset", "Executor Wallet"
  // Indexer status — true means we have a live decoder that can score this
  // category right now. False means the category is registered/visible but
  // agents can only land as candidates until a decoder ships.
  decoderLive: boolean;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "tokenized_buyback",
    label: "Tokenized",
    longLabel: "Tokenized Buyback Agents",
    blurb:
      "Agents with an SPL token whose protocol routes fees into on-chain buybacks (and optional burns).",
    identifierKind: "mint",
    identifierLabel: "Mint",
    decoderLive: true,
  },
  {
    id: "registered_agent",
    label: "Registered",
    longLabel: "MPL Registered Agents",
    blurb:
      "Agents with a verified Metaplex Agent Identity PDA bound to an MPL Core asset.",
    identifierKind: "core_asset",
    identifierLabel: "MPL Core Asset",
    decoderLive: true,
  },
  {
    id: "x402_executor",
    label: "x402",
    longLabel: "x402 Payment Executors",
    blurb:
      "Wallets receiving HTTP-402 micropayments — Coinbase / Linux Foundation x402 protocol on Solana.",
    identifierKind: "executor_wallet",
    identifierLabel: "Executor Wallet",
    decoderLive: true,
  },
  {
    id: "copy_trader",
    label: "Copy-Traders",
    longLabel: "Copy-Trading Agents",
    blurb:
      "Agents executing public swap strategies. PnL benchmarking ships in a follow-up wave.",
    identifierKind: "executor_wallet",
    identifierLabel: "Executor Wallet",
    decoderLive: false,
  },
  {
    id: "task_executor",
    label: "Tasks",
    longLabel: "Task Executors",
    blurb:
      "Agents that complete priced tasks attested via the Validation Registry. Decoder pending.",
    identifierKind: "executor_wallet",
    identifierLabel: "Executor Wallet",
    // Flip only after DB-backed ingest replay/conflict tests pass, cron score
    // output is verified, and production has emitted OC_FAILED + OC_SLASHED.
    // Raise FAILURE_DECODER_COVERAGE.task_executor to 1.0 in the same release.
    decoderLive: false,
  },
  {
    id: "general",
    label: "General",
    longLabel: "General Solana Agents",
    blurb: "Anything else — wallets and assets that don't fit the above categories yet.",
    identifierKind: "executor_wallet",
    identifierLabel: "Executor Wallet",
    decoderLive: false,
  },
];

export const CATEGORIES_BY_ID: Record<AgentCategory, CategoryMeta> =
  CATEGORIES.reduce(
    (acc, c) => {
      acc[c.id] = c;
      return acc;
    },
    {} as Record<AgentCategory, CategoryMeta>,
  );

export function categoryMeta(id: string | null | undefined): CategoryMeta {
  if (id && id in CATEGORIES_BY_ID) {
    return CATEGORIES_BY_ID[id as AgentCategory];
  }
  return CATEGORIES_BY_ID.tokenized_buyback;
}

export function categoryLabel(id: string | null | undefined): string {
  return categoryMeta(id).label;
}

export function isLiveCategory(id: string | null | undefined): boolean {
  return categoryMeta(id).decoderLive;
}

// Lightweight on-chain identifier classifier used by /register and submit
// flows. Keeps users from needing to pick a kind manually in the common case.
//
// Heuristics (intentionally conservative — falls back to "mint" since that
// remains the dominant entry today):
//   - 32–44 base58 chars and starts with the MPL Agent Identity / Tools
//     program prefixes → core_asset (asset addresses themselves are also
//     base58 pubkeys, so we use a checksum approach: look up via the
//     verifier instead of guessing here).
//   - Otherwise treat as mint and let the verifier resolve the actual kind.
export function guessIdentifierKind(input: string): IdentifierKind {
  const v = input.trim();
  if (v.length < 32 || v.length > 44) return "mint";
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(v)) return "mint";
  // Without an RPC call we can't reliably tell mint vs core asset vs wallet
  // by the pubkey alone — they are all base58 pubkeys. Default to mint and
  // let the verifier pick.
  return "mint";
}
