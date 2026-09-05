/**
 * @spx402/agentkit-action-provider
 *
 * Coinbase AgentKit action provider for SPX402. Gives agent runtimes
 * (AgentKit, ElizaOS via adapters, Agentic Wallets) first-class actions for:
 *
 *   - spx402_get_agent_grade      — free read: execution grade + confidence
 *   - spx402_list_verified_agents — free read: the verified cohort
 *   - spx402_get_agent_dossier    — PAID (0.05 USDC on Base via x402)
 *   - spx402_get_evidence_bundle  — PAID (0.05 USDC on Base via x402)
 *
 * Paid actions use the wallet attached to the AgentKit instance: they call
 * the endpoint, receive HTTP 402, send USDC on Base to the payTo address in
 * the 402 payload, and retry with the settlement hash as `x-payment`.
 *
 * Settlement is always caller-funded. SPX402 sponsors no gas — the agent's
 * wallet supplies its own USDC and Base ETH for execution fees.
 */

import { z } from "zod";

// Structural type so we stay import-compatible with @coinbase/agentkit
// without pinning its internals. When installed alongside AgentKit this
// satisfies `ActionProvider<WalletProvider>` directly.
interface AgentKitWalletLike {
  getAddress(): string;
  sendTransaction(tx: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }): Promise<`0x${string}`>;
  waitForTransactionReceipt?(hash: `0x${string}`): Promise<unknown>;
}

interface ActionContext {
  wallet?: AgentKitWalletLike;
}

export interface Spx402ProviderOptions {
  /** Defaults to https://spx402.com */
  baseUrl?: string;
  /** Optional SPX402 API key — skips per-call payment when present. */
  apiKey?: string;
}

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const ERC20_TRANSFER_SELECTOR = "0xa9059cbb";

const MintSchema = z.object({
  mint: z
    .string()
    .min(8)
    .max(128)
    .describe(
      "Agent identifier — Solana mint, MPL core asset, or executor wallet.",
    ),
});

const ListSchema = z.object({
  category: z
    .enum(["tokenized_buyback", "registered_agent", "x402_executor"])
    .optional()
    .describe("Filter by SPX402 agent category."),
  minScore: z.number().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

interface PaymentRequirements {
  maxAmountRequired: string;
  asset: string;
  payTo: string;
}

function encodeErc20Transfer(to: string, amount: bigint): `0x${string}` {
  const toWord = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const amountWord = amount.toString(16).padStart(64, "0");
  return `${ERC20_TRANSFER_SELECTOR}${toWord}${amountWord}` as `0x${string}`;
}

export class Spx402ActionProvider {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(options: Spx402ProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://spx402.com").replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  /** AgentKit metadata. */
  readonly name = "spx402";
  readonly supportsNetwork = () => true;

  // ── Free reads ────────────────────────────────────────────────────────

  async getAgentGrade(input: z.infer<typeof MintSchema>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/public/agent/${input.mint}/evidence`);
    if (res.status === 404) return `No SPX402 record for ${input.mint}.`;
    if (!res.ok) return `SPX402 request failed: HTTP ${res.status}`;
    return JSON.stringify(await res.json());
  }

  async listVerifiedAgents(input: z.infer<typeof ListSchema>): Promise<string> {
    const qs = new URLSearchParams({ limit: String(input.limit) });
    if (input.category) qs.set("category", input.category);
    if (input.minScore !== undefined) qs.set("min_score", String(input.minScore));
    const res = await fetch(`${this.baseUrl}/api/public/verified?${qs}`);
    if (!res.ok) return `SPX402 request failed: HTTP ${res.status}`;
    return JSON.stringify(await res.json());
  }

  // ── Paid reads (x402, caller-funded) ──────────────────────────────────

  async getAgentDossier(
    input: z.infer<typeof MintSchema>,
    context: ActionContext,
  ): Promise<string> {
    return this.paidCall(`/api/v1/agent/${input.mint}/dossier`, context);
  }

  async getEvidenceBundle(
    input: z.infer<typeof MintSchema>,
    context: ActionContext,
  ): Promise<string> {
    return this.paidCall(`/api/v1/agent/${input.mint}/evidence`, context);
  }

  /**
   * The x402 dance: try, receive 402 with payment requirements, pay USDC on
   * Base from the agent's own wallet, retry with the settlement hash.
   */
  private async paidCall(path: string, context: ActionContext): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {};
    if (this.apiKey) headers["x-api-key"] = this.apiKey;

    const first = await fetch(url, { headers });
    if (first.ok) return JSON.stringify(await first.json());
    if (first.status !== 402) return `SPX402 request failed: HTTP ${first.status}`;
    if (this.apiKey) {
      const body = (await first.json().catch(() => ({}))) as { error?: string };
      return `SPX402 rejected the API key: ${body.error ?? "unauthorized"}`;
    }

    const wallet = context.wallet;
    if (!wallet) {
      return (
        "Payment required (x402). Attach a funded wallet to AgentKit — " +
        "SPX402 is pay-per-call and sponsors no gas."
      );
    }

    const body = (await first.json()) as { x402?: PaymentRequirements };
    const req = body.x402;
    if (!req?.payTo || !req.maxAmountRequired) {
      return "SPX402 did not return usable payment requirements.";
    }
    if (req.asset.toLowerCase() !== BASE_USDC.toLowerCase()) {
      return `Unsupported payment asset: ${req.asset}`;
    }

    // Funded by the caller. SPX402 pays nothing on the agent's behalf.
    const txHash = await wallet.sendTransaction({
      to: BASE_USDC,
      data: encodeErc20Transfer(req.payTo, BigInt(req.maxAmountRequired)),
    });
    if (wallet.waitForTransactionReceipt) {
      await wallet.waitForTransactionReceipt(txHash);
    } else {
      // Cheap finality wait — Base blocks are ~2s, SPX402 requires 2 confs.
      await new Promise((r) => setTimeout(r, 6_000));
    }

    const paid = await fetch(url, { headers: { "x-payment": txHash } });
    if (!paid.ok) {
      const err = (await paid.json().catch(() => ({}))) as { error?: string };
      return `Payment sent (${txHash}) but SPX402 still refused: ${err.error ?? paid.status}`;
    }
    return JSON.stringify(await paid.json());
  }

  /** AgentKit discovers actions through this manifest. */
  getActions() {
    return [
      {
        name: "spx402_get_agent_grade",
        description:
          "Get the SPX402 execution grade, score and confidence for an agent. Free.",
        schema: MintSchema,
        invoke: (input: z.infer<typeof MintSchema>) => this.getAgentGrade(input),
      },
      {
        name: "spx402_list_verified_agents",
        description: "List SPX402-verified agents with grades. Free.",
        schema: ListSchema,
        invoke: (input: z.infer<typeof ListSchema>) => this.listVerifiedAgents(input),
      },
      {
        name: "spx402_get_agent_dossier",
        description:
          "Full agent dossier with events and SVG card. Costs 0.05 USDC on Base (x402, paid from your wallet).",
        schema: MintSchema,
        invoke: (input: z.infer<typeof MintSchema>, context: ActionContext) =>
          this.getAgentDossier(input, context),
      },
      {
        name: "spx402_get_evidence_bundle",
        description:
          "Merkle-rooted evidence bundle for an agent. Costs 0.05 USDC on Base (x402, paid from your wallet).",
        schema: MintSchema,
        invoke: (input: z.infer<typeof MintSchema>, context: ActionContext) =>
          this.getEvidenceBundle(input, context),
      },
    ];
  }
}

export function spx402ActionProvider(options?: Spx402ProviderOptions) {
  return new Spx402ActionProvider(options);
}
