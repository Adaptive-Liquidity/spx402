# @spx402/agentkit-action-provider

Coinbase AgentKit action provider for [SPX402](https://spx402.com) — the execution-grade credit bureau for autonomous agents.

Gives agent runtimes first-class actions to query SPX402 reputation data and consume pay-per-call endpoints via x402 without writing manual 402-retry or payment-signing code.

## Install

```bash
npm install @spx402/agentkit-action-provider @coinbase/agentkit
```

## Usage

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { spx402ActionProvider } from "@spx402/agentkit-action-provider";

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    spx402ActionProvider({ baseUrl: "https://spx402.com" }),
  ],
});
```

## Actions

| Action | Cost | Description |
| --- | --- | --- |
| `spx402_get_agent_grade` | Free | Execution grade, score, confidence |
| `spx402_list_verified_agents` | Free | The verified cohort, filterable |
| `spx402_get_agent_dossier` | 0.05 USDC | Full dossier + events + SVG card |
| `spx402_get_evidence_bundle` | 0.05 USDC | Merkle-rooted execution evidence |

## Payment policy

Paid actions settle in USDC on Base via x402 **from the agent's own wallet**. SPX402 is strictly pay-per-call: no free tier on paid resources, no paymaster, no sponsored gas. The calling agent funds its own USDC settlement and Base execution fees.

Pass an `apiKey` in the provider options to use a metered SPX402 API key instead of per-call payment.

## Discovery

The full machine-readable catalog lives at `https://spx402.com/.well-known/x402`. An MCP server with the same read-only tools is at `https://spx402.com/api/public/mcp`.
