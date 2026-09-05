// Tier 1 §1 — Public MCP server (Model Context Protocol).
//
// POST /api/public/mcp
//
// A minimal streamable-HTTP MCP endpoint so agent runtimes (Claude, Cursor,
// ElizaOS, Agentic Wallets) can query SPX402 natively as tools — no manual
// fetch plumbing. Read-only by design: every tool maps 1:1 to public data
// the site already shows. Paid depth (full dossier, evidence bundles) stays
// on the x402 pay-per-call endpoints; agents calling those bring their own
// USDC settlement — SPX402 sponsors no gas.
//
// Protocol: JSON-RPC 2.0 over POST. Supports initialize, tools/list,
// tools/call. No auth. Rate-limited per caller like the other free public
// endpoints.

import { createFileRoute } from "@tanstack/react-router";
import { enforceRateLimit, type RateLimitRule } from "@/lib/http/rate-limit.server";

const MCP_RULE: RateLimitRule = { name: "mcp", limit: 120, windowSeconds: 60 };

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "spx402", version: "1.0.0" };

const TOOLS = [
  {
    name: "spx_list_verified_agents",
    description:
      "List agents verified by SPX402 with their execution grade, score and confidence. Keyset-paginated, filterable by category and minimum score.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["tokenized_buyback", "registered_agent", "x402_executor"],
        },
        min_score: { type: "number", minimum: 0, maximum: 100 },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "spx_get_agent_grade",
    description:
      "Get the SPX402 execution grade, score and confidence for one agent by its identifier (Solana mint, MPL core asset, or executor wallet).",
    inputSchema: {
      type: "object",
      properties: {
        mint: { type: "string", description: "Agent identifier" },
      },
      required: ["mint"],
      additionalProperties: false,
    },
  },
  {
    name: "spx_get_tape",
    description:
      "Read the live execution tape — recent verified on-chain agent events (settlements, buybacks, failures) with severity and chain.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        mint: { type: "string", description: "Filter to one agent identifier" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "spx_list_facilitators",
    description:
      "List the x402 payment facilitators SPX402 tracks, with chain, settlement address and active status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
] as const;

type JsonRpcId = string | number | null;

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function textResult(value: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    isError: false,
  };
}

function toolError(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  switch (name) {
    case "spx_list_verified_agents": {
      const limit = Math.min(Math.max(Number(args["limit"]) || 25, 1), 100);
      const category = typeof args["category"] === "string" ? args["category"] : null;
      const minScore = Number.isFinite(Number(args["min_score"]))
        ? Number(args["min_score"])
        : null;
      let q = supabaseAdmin
        .from("agents")
        .select(
          "mint, symbol, name, category, grade, score, confidence_score, operator_verified, status, updated_at",
        )
        .eq("status", "active")
        .order("score", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (category && ["tokenized_buyback", "registered_agent", "x402_executor"].includes(category)) {
        q = q.eq("category", category);
      }
      if (minScore !== null) q = q.gte("score", Math.min(Math.max(minScore, 0), 100));
      const { data, error } = await q;
      if (error) return toolError("upstream_unavailable");
      return textResult({
        agents: (data ?? []).map((r) => ({
          mint: r.mint,
          symbol: r.symbol,
          name: r.name,
          category: r.category,
          grade: r.grade,
          score: r.score,
          confidence: Number(r.confidence_score ?? 0),
          operator_verified: r.operator_verified ?? false,
          permalink: `/agent/${r.mint}`,
        })),
      });
    }

    case "spx_get_agent_grade": {
      const mint = typeof args["mint"] === "string" ? args["mint"].trim() : "";
      if (!mint || mint.length > 128) return toolError("invalid mint");
      const { data, error } = await supabaseAdmin
        .from("agents")
        .select(
          "mint, symbol, name, category, grade, score, confidence_score, status, failed_windows, scored_at",
        )
        .eq("mint", mint)
        .maybeSingle();
      if (error) return toolError("upstream_unavailable");
      if (!data) return toolError("not_found: no agent indexed under that identifier");
      return textResult({
        mint: data.mint,
        symbol: data.symbol,
        name: data.name,
        category: data.category,
        grade: data.grade,
        score: data.score,
        confidence: Number(data.confidence_score ?? 0),
        failed_windows: data.failed_windows ?? 0,
        last_scored_at: data.scored_at,
        permalink: `/agent/${data.mint}`,
      });
    }

    case "spx_get_tape": {
      const limit = Math.min(Math.max(Number(args["limit"]) || 20, 1), 50);
      const mint = typeof args["mint"] === "string" ? args["mint"].trim() : null;
      let q = supabaseAdmin
        .from("agent_events")
        .select("id, mint, type, severity, chain, amount_sol, amount_token, signature, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (mint) q = q.eq("mint", mint);
      const { data, error } = await q;
      if (error) return toolError("upstream_unavailable");
      return textResult({
        events: (data ?? []).map((r) => ({
          id: r.id,
          type: r.type,
          chain: r.chain ?? "solana",
          mint: r.mint,
          severity: r.severity,
          amount_sol: Number(r.amount_sol ?? 0),
          amount_token: Number(r.amount_token ?? 0),
          tx: r.signature,
          occurred_at: r.occurred_at,
        })),
      });
    }

    case "spx_list_facilitators": {
      const { data, error } = await supabaseAdmin
        .from("facilitators")
        .select("id, name, chain, address, source_url, active")
        .order("chain", { ascending: true })
        .order("id", { ascending: true })
        .limit(100);
      if (error) return toolError("upstream_unavailable");
      return textResult({ facilitators: data ?? [] });
    }

    default:
      return toolError(`unknown_tool: ${name}`);
  }
}

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limited = await enforceRateLimit(request, MCP_RULE);
        if (limited.response) return limited.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify(rpcError(null, -32700, "Parse error")), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const messages = Array.isArray(body) ? body : [body];
        const responses: unknown[] = [];

        for (const msg of messages as Array<Record<string, unknown>>) {
          const id = (msg?.["id"] ?? null) as JsonRpcId;
          const method = msg?.["method"];
          if (msg?.["jsonrpc"] !== "2.0" || typeof method !== "string") {
            responses.push(rpcError(id, -32600, "Invalid Request"));
            continue;
          }

          // Notifications get no response.
          if (msg["id"] === undefined || msg["id"] === null) {
            if (method === "notifications/initialized") continue;
            continue;
          }

          switch (method) {
            case "initialize":
              responses.push(
                rpcResult(id, {
                  protocolVersion: PROTOCOL_VERSION,
                  capabilities: { tools: {} },
                  serverInfo: SERVER_INFO,
                  instructions:
                    "SPX402 read-only agent reputation tools. Paid depth (full dossiers, evidence bundles) is served via x402 pay-per-call at /.well-known/x402 — callers fund their own USDC settlement on Base.",
                }),
              );
              break;

            case "ping":
              responses.push(rpcResult(id, {}));
              break;

            case "tools/list":
              responses.push(rpcResult(id, { tools: TOOLS }));
              break;

            case "tools/call": {
              const params = msg["params"] as Record<string, unknown> | undefined;
              const name = params?.["name"];
              const args = (params?.["arguments"] ?? {}) as Record<string, unknown>;
              if (typeof name !== "string") {
                responses.push(rpcError(id, -32602, "tools/call requires a string name"));
                break;
              }
              try {
                responses.push(rpcResult(id, await callTool(name, args)));
              } catch (e) {
                console.error("[mcp] tool call failed", name, e);
                responses.push(rpcResult(id, toolError("internal_error")));
              }
              break;
            }

            default:
              responses.push(rpcError(id, -32601, `Method not found: ${method}`));
          }
        }

        return new Response(JSON.stringify(responses.length === 1 ? responses[0] : responses), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
            ...limited.headers,
          },
        });
      },

      // Discovery-friendly: a GET returns a descriptor instead of 405 so
      // crawlers and humans can see the endpoint exists and how to speak to it.
      GET: async ({ request }) => {
        const limited = await enforceRateLimit(request, MCP_RULE);
        if (limited.response) return limited.response;
        const origin = new URL(request.url).origin;
        return new Response(
          JSON.stringify(
            {
              protocol: "mcp",
              protocolVersion: PROTOCOL_VERSION,
              serverInfo: SERVER_INFO,
              transport: "streamable-http",
              endpoint: `${origin}/api/public/mcp`,
              tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
              paidEndpoints: `${origin}/.well-known/x402`,
              policy:
                "Read-only, no auth. Paid endpoints are caller-funded: agents supply their own USDC settlement; SPX402 sponsors no gas.",
            },
            null,
            2,
          ),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300, s-maxage=3600",
              ...limited.headers,
            },
          },
        );
      },

      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version",
          },
        }),
    },
  },
});
