// Wave 4 — Verified API.
//
// GET /api/public/verified
//
// Paginated, filterable list of agents SPX has verified. This is the
// canonical machine-readable feed for downstream consumers (x402 Bazaar,
// ERC-8004 reputation registries, agent runtimes, dashboards) that want
// to ingest "the SPX cohort" without scraping the UI.
//
// Filters:
//   - category=tokenized_buyback|registered_agent|x402_executor
//   - grade=SPX_AAA|SPX_AA|SPX_A|SPX_BBB|SPX_BB|SPX_B|SPX_D|SPX_404
//   - min_score=0..100
//   - min_confidence=0..1
//   - cursor (string, opaque) + limit (1..200, default 50)
//
// Aggressive CDN caching since the underlying snapshot only updates
// after cron-scoring + cron-score-snapshot. Public, immutable-ish.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export const Route = createFileRoute("/api/public/verified")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const params = url.searchParams;

        const category = sanitizeEnum(params.get("category"), [
          "tokenized_buyback",
          "registered_agent",
          "x402_executor",
        ]);
        const grade = sanitizeGrade(params.get("grade"));
        const minScore = clampNumber(params.get("min_score"), 0, 100);
        const minConfidence = clampNumber(params.get("min_confidence"), 0, 1);
        const limit = Math.min(
          Math.max(parseInt(params.get("limit") ?? "", 10) || DEFAULT_LIMIT, 1),
          MAX_LIMIT,
        );
        const cursor = params.get("cursor");

        let q = supabaseAdmin
          .from("agents")
          .select(
            "mint, symbol, name, category, identifier_kind, executor_wallet, core_asset, operator_wallet, operator_verified, score, grade, confidence_score, methodology_version, confidence_model_version, parser_version, status, total_buyback_sol, total_burned_tokens, failed_windows, scored_at, updated_at",
          )
          .eq("status", "active")
          .order("score", { ascending: false, nullsFirst: false })
          .order("mint", { ascending: true })
          .limit(limit + 1); // peek for next-cursor

        if (category) q = q.eq("category", category);
        if (grade) q = q.eq("grade", grade);
        if (minScore !== null) q = q.gte("score", minScore);
        if (minConfidence !== null) q = q.gte("confidence_score", minConfidence);

        if (cursor) {
          const decoded = decodeCursor(cursor);
          if (decoded) {
            // Keyset pagination on (score DESC, mint ASC)
            q = q.or(
              `score.lt.${decoded.score},and(score.eq.${decoded.score},mint.gt.${decoded.mint})`,
            );
          }
        }

        const { data, error } = await q;
        if (error) {
          return jsonResponse({ error: "db_error", detail: error.message }, 500);
        }

        const rows = data ?? [];
        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;

        const items = page.map((r) => ({
          subject: {
            type: subjectTypeFor(r.identifier_kind ?? "mint"),
            id: r.mint,
            symbol: r.symbol,
            name: r.name,
            category: r.category,
            executor_wallet: r.executor_wallet,
            core_asset: r.core_asset,
            operator_wallet: r.operator_wallet,
            operator_verified: r.operator_verified ?? false,
          },
          grade: r.grade,
          score: r.score,
          confidence: Number(r.confidence_score ?? 0),
          status: r.status,
          stats: {
            total_buyback_sol: Number(r.total_buyback_sol ?? 0),
            total_burned_tokens: Number(r.total_burned_tokens ?? 0),
            failed_windows: r.failed_windows ?? 0,
          },
          methodology: {
            score_model: r.methodology_version,
            confidence_model: r.confidence_model_version,
            parser_version: r.parser_version,
          },
          bond: { bonded: false }, // Wave 6
          attestation: null,        // Wave 5
          links: {
            permalink: `/agent/${r.mint}`,
            evidence: `/api/public/agent/${r.mint}/evidence`,
            badge_svg: `/api/public/badge/${r.mint}.svg`,
            embed: `/embed/${r.mint}`,
          },
          last_scored_at: r.scored_at,
          updated_at: r.updated_at,
        }));

        const lastRow = page[page.length - 1];
        const nextCursor =
          hasMore && lastRow
            ? encodeCursor({ score: Number(lastRow.score ?? 0), mint: lastRow.mint })
            : null;

        const body = {
          schema: "spx.verified.v1",
          generated_at: new Date().toISOString(),
          filters: {
            category: category ?? null,
            grade: grade ?? null,
            min_score: minScore,
            min_confidence: minConfidence,
            limit,
          },
          page: { count: items.length, has_more: hasMore, next_cursor: nextCursor },
          items,
        };

        return jsonResponse(body, 200, {
          // Snapshots refresh after scoring cron — 5min edge cache, 1h SWR.
          "Cache-Control":
            "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});

function jsonResponse(
  body: unknown,
  status: number,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extra,
    },
  });
}

function sanitizeEnum<T extends string>(v: string | null, allowed: T[]): T | null {
  if (!v) return null;
  return (allowed as string[]).includes(v) ? (v as T) : null;
}

function sanitizeGrade(v: string | null): string | null {
  if (!v) return null;
  // Accept both URL-safe ("SPX_A") and display ("SPX A") forms.
  const normalized = v.replace(/_/g, " ").trim().toUpperCase();
  const allowed = [
    "SPX AAA",
    "SPX AA",
    "SPX A",
    "SPX BBB",
    "SPX BB",
    "SPX B",
    "SPX D",
    "SPX404",
  ];
  if (allowed.includes(normalized)) return normalized;
  if (normalized === "SPX 404") return "SPX404";
  return null;
}

function clampNumber(v: string | null, lo: number, hi: number): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, lo), hi);
}

function subjectTypeFor(identifierKind: string): string {
  if (identifierKind === "core_asset") return "solana_mpl_asset";
  if (identifierKind === "executor_wallet") return "solana_wallet";
  return "solana_mint";
}

function encodeCursor(c: { score: number; mint: string }): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

function decodeCursor(s: string): { score: number; mint: string } | null {
  try {
    const obj = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (typeof obj?.score !== "number" || typeof obj?.mint !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}
