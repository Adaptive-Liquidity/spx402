import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { listVerifiedServices } from "@/lib/x402";
import { listRegisteredExecutors } from "@/lib/executors";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const baseUrl = "https://spx402.com";

          const staticPages = [
            "",
            "/agents",
            "/leaderboard",
            "/explore",
            "/tape",
            "/methodology",
            "/replay",
            "/api-docs",
            "/register",
            "/faq",
            "/about",
            "/status",
            "/badge",
            "/pulse",
            "/feeds",
            "/operators",
            "/flagged",
            "/glossary",
            "/agent-integrations",
            "/trust/api",
            "/trust/embed",
            "/developers",
            "/legal/terms",
            "/legal/privacy",
            "/x402",
          ];

          // Keyset-paginate by mint — the table is small now, but offset
          // paging gets linearly slower as it grows. The shared admin client
          // also avoids constructing a new client per request.
          const mints: string[] = [];
          let lastMint: string | null = null;
          const pageSize = 1000;
          for (;;) {
            let query = supabaseAdmin
              .from("agents")
              .select("mint")
              .order("mint", { ascending: true })
              .limit(pageSize);
            if (lastMint) query = query.gt("mint", lastMint);
            const { data: rows } = await query;
            const page = rows ?? [];
            for (const r of page) mints.push(r.mint);
            if (page.length < pageSize) break;
            lastMint = page[page.length - 1].mint;
          }

          // x402 service and AEON operator pages are public dossiers too.
          const [services, executors] = await Promise.all([
            listVerifiedServices(1000),
            listRegisteredExecutors(1000),
          ]);

          const urls = [
            ...staticPages.map(
              (page) => `  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === "" ? "1.0" : "0.8"}</priority>
  </url>`,
            ),
            ...mints.map(
              (mint) => `  <url>
    <loc>${baseUrl}/agent/${mint}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.6</priority>
  </url>`,
            ),
            ...services.map(
              (s) => `  <url>
    <loc>${baseUrl}/service/${s.id}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.5</priority>
  </url>`,
            ),
            ...executors.map(
              (e) => `  <url>
    <loc>${baseUrl}/operator/${e.cri_address}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.5</priority>
  </url>`,
            ),
          ];

          const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

          return new Response(xml, {
            status: 200,
            headers: {
              "Content-Type": "application/xml",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (error) {
          console.error("Sitemap generation error:", error);
          return new Response("Error generating sitemap", { status: 500 });
        }
      },
    },
  },
});
