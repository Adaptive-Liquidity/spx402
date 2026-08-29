#!/usr/bin/env bun
/**
 * Import x402 services from a public directory / bazaar listing into
 * x402_service. Script, not a cron — directory formats are unstable and we
 * want a human in the loop.
 *
 * Usage:
 *   bun run scripts/import-x402-directory.ts --url https://<directory>/index.json
 *   bun run scripts/import-x402-directory.ts --file ./listing.json [--dry]
 *
 * Expected shape (either a bare array or { items: [...] }):
 *   [{ "url": "https://api.example.com/paid",
 *      "chain": "base", "payTo": "0x…", "facilitator": "…" }]
 *
 * Writes through the admin endpoint so the same validation path is used
 * everywhere. Requires SPX_ADMIN_SECRET and SPX_BASE_URL in the environment.
 */

interface Listing {
  url?: string;
  resource?: string;
  chain?: string;
  network?: string;
  payTo?: string;
  pay_to?: string;
  facilitator?: string;
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}

async function main() {
  const src = arg("url");
  const file = arg("file");
  const dry = process.argv.includes("--dry");

  if (!src && !file) {
    console.error("need --url <directory-json> or --file <path>");
    process.exit(1);
  }

  const raw = src ? await (await fetch(src)).text() : await Bun.file(file!).text();

  const parsed = JSON.parse(raw) as Listing[] | { items?: Listing[] };
  const items = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
  console.log(`found ${items.length} listing(s)`);

  const base = process.env["SPX_BASE_URL"] ?? "https://spx402.com";
  const secret = process.env["SPX_ADMIN_SECRET"];
  if (!dry && !secret) {
    console.error("SPX_ADMIN_SECRET required (or pass --dry)");
    process.exit(1);
  }

  let ok = 0;
  for (const item of items) {
    const url = item.url ?? item.resource;
    if (!url) continue;
    const payload = {
      url,
      chain: (item.chain ?? item.network) === "base" ? "base" : "solana",
      payTo: item.payTo ?? item.pay_to ?? null,
      facilitator: item.facilitator ?? null,
      discoveredVia: "directory_import",
      probeTier: "challenge",
    };

    if (dry) {
      console.log("DRY", payload);
      continue;
    }

    const res = await fetch(`${base}/api/public/admin-add-service`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    console.log(res.status, url, body.slice(0, 160));
    if (res.ok) ok += 1;
  }

  console.log(dry ? "dry run complete" : `imported/updated ${ok}/${items.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
