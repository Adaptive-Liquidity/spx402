import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Panel } from "@/components/spx/Panel";
import { PreflightCard } from "@/components/spx/PreflightCard";
import { scanEndpoint } from "@/lib/preflight.functions";
import { PREFLIGHT_QUESTION, type PreflightCardModel } from "@/lib/preflight/model";

export const Route = createFileRoute("/build/preflight")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/build/preflight" }],
    meta: [
      { property: "og:url", content: "https://spx402.com/build/preflight" },
      { title: "Preflight — Check an x402 endpoint before you pay it · SPX402" },
      {
        name: "description",
        content:
          "Call any x402 endpoint once, for free, and see what it actually did: HTTP status, whether the payment challenge parsed, and whether the quote held across two calls.",
      },
      { property: "og:title", content: "SPX402 Preflight" },
      {
        property: "og:description",
        content: "What did this endpoint do when we called it? One scan, recorded and timestamped.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://spx402.com/api/public/share.png" },
      { name: "twitter:image", content: "https://spx402.com/api/public/share.png" },
    ],
  }),
  component: PreflightPage,
});

function PreflightPage() {
  const scan = useServerFn(scanEndpoint);
  const [url, setUrl] = useState("");
  const [card, setCard] = useState<PreflightCardModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await scan({ data: { url } });
      setCard(result.card as PreflightCardModel);
    } catch (err) {
      setCard(null);
      setError(err instanceof Error ? err.message : "Scan failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stage section">
            <h1 className="max-w-3xl font-display text-3xl font-bold tracking-tight text-paper">
        {PREFLIGHT_QUESTION}
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-paper-muted">
        Paste an x402 endpoint. We call it once, for free, and record exactly what came back. No
        account, no payment, no verdict — just the observation and the time we made it.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="preflight-url">
          Endpoint address
        </label>
        <input
          id="preflight-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/v1/resource"
          className="flex-1 border border-bronze/60 bg-panel px-4 py-3 font-mono text-sm text-paper outline-none placeholder:text-wire focus:border-amber"
        />
        <button
          type="submit"
          disabled={busy || url.trim().length === 0}
          className="border border-amber bg-amber/10 px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-amber transition-colors hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Scanning…" : "Scan"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-4 font-mono text-sm text-critical">
          {error}
        </p>
      ) : null}

      {card ? <PreflightCard card={card} className="mt-10 max-w-3xl" /> : null}

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <Panel title="What this does">
          <ul className="space-y-3 text-sm text-paper-muted">
            <li>Calls the endpoint and records the HTTP status it returned.</li>
            <li>
              Parses the payment challenge — protocol version, accepted methods, network, asset,
              receiving address and amount.
            </li>
            <li>
              Asks a second time and compares the two quotes. A difference is reported as{" "}
              <span className="text-paper">quote changed</span>, nothing more: services
              legitimately rotate receiving addresses and vary pricing.
            </li>
            <li>
              Compares the listed price against the sample of prices we have recorded ourselves,
              always shown with the sample size and the date.
            </li>
            <li>
              Flags a transport or protocol-version mismatch that would stop a standard client
              paying.
            </li>
          </ul>
        </Panel>

        <Panel title="What this does not do">
          <ul className="space-y-3 text-sm text-paper-muted">
            <li>
              It does not tell you an endpoint is safe to pay. There is no safe rating here and
              there never will be.
            </li>
            <li>It does not call anything a scam or a honeypot.</li>
            <li>It does not pay the endpoint, so it cannot confirm delivery after payment.</li>
            <li>
              It does not read the receiving wallet&rsquo;s on-chain history and turn it into a
              trust score.
            </li>
            <li>
              Preflight is a separate lane. It has no effect on the Pump execution grades on{" "}
              <span className="text-paper">/agent/&lt;mint&gt;</span>.
            </li>
          </ul>
        </Panel>
      </section>

      <p className="mt-12 max-w-3xl text-sm text-paper-muted">
        Other live products check x402 endpoints too — vet402, x402 Trust, x402 Doctor, ScoutScore,
        ResolveBots, gold-402, AgentTrust and Coinbase&rsquo;s own validate endpoint among them.
        Some go further than this free tier does. We publish what we observed and the time we
        observed it; compare it against anything else you trust.
      </p>
    </div>
  );
}
