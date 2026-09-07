import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://spx402.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_PATHS: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/leaderboard", changefreq: "hourly", priority: "0.9" },
  { path: "/tape", changefreq: "hourly", priority: "0.9" },
  { path: "/explore", changefreq: "daily", priority: "0.8" },
  { path: "/flagged", changefreq: "daily", priority: "0.7" },
  { path: "/pulse", changefreq: "hourly", priority: "0.7" },
  { path: "/preflight", changefreq: "weekly", priority: "0.8" },
  { path: "/operators", changefreq: "weekly", priority: "0.7" },
  { path: "/methodology", changefreq: "weekly", priority: "0.8" },
  { path: "/pricing", changefreq: "weekly", priority: "0.7" },
  { path: "/badge", changefreq: "weekly", priority: "0.6" },
  { path: "/api", changefreq: "weekly", priority: "0.6" },
  { path: "/api/docs", changefreq: "weekly", priority: "0.6" },
  { path: "/alerts", changefreq: "weekly", priority: "0.6" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/register", changefreq: "monthly", priority: "0.5" },
  { path: "/status", changefreq: "daily", priority: "0.4" },
  { path: "/changelog", changefreq: "weekly", priority: "0.4" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.2" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_PATHS];

        try {
          const { createClient } = await import("@supabase/supabase-js");
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
          const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
              fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) {
                  headers.delete("Authorization");
                }
                headers.set("apikey", key);
                return fetch(input, { ...init, headers });
              },
            },
          });

          const pageSize = 1000;
          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabase
              .from("agents")
              .select("mint")
              .order("mint")
              .range(offset, offset + pageSize - 1);
            if (error || !data) break;
            entries.push(
              ...data
                .filter((a): a is { mint: string } => typeof a.mint === "string" && !!a.mint)
                .map((a) => ({
                  path: `/agent/${encodeURIComponent(a.mint)}`,
                  changefreq: "daily" as const,
                  priority: "0.6",
                })),
            );
            if (data.length < pageSize) break;
          }
        } catch {
          // A database hiccup must never 500 the sitemap: serve static routes.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
