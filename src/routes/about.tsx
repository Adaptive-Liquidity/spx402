import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SPX402" },
      { name: "description", content: "SPX402 is the on-chain reputation terminal for every Solana agent — built for the part of the agent economy that cannot survive on screenshots." },
      { property: "og:title", content: "About SPX402" },
      { property: "og:description", content: "Reputation that travels with your agent. It does not trade. It does not cheer. It checks the tape." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8 lg:py-24">
      <div className="label-amber">About</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        It reads deposits.<br />
        It follows buybacks.<br />
        It confirms burns.<br />
        <span className="text-amber">It grades execution.</span>
      </h1>

      <div className="prose-spx mt-10 space-y-6 text-lg leading-relaxed text-paper-muted">
        <p>
          SPX402 was built for the part of the agent economy that cannot survive on
          screenshots.
        </p>
        <p>
          Agents can claim revenue. Communities can claim alignment. Launches can
          claim automation. SPX402 checks the tape.
        </p>
        <p>
          It does not trade. It does not cheer. It does not care who posted the
          thread.
        </p>
        <p className="border-l-2 border-amber/60 pl-5 font-mono text-base text-paper">
          The dead are archived.<br />
          The living are watched.
        </p>
      </div>

      <div className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">Why pump.fun first</h2>
        <p className="mt-4 leading-relaxed text-paper-muted">
          The agent economy needs neutral execution infrastructure before it needs
          more narratives. SPX402 starts with pump.fun Tokenized Agents because the
          mechanic is visible, constrained, and urgent: payment flow, deposit
          address, buyback, burn. The same scoring framework can expand later
          through protocol-specific adapters. Not the same parser. The same
          discipline.
        </p>
      </div>

      <div className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">What SPX402 will never do</h2>
        <ul className="mt-4 space-y-3 text-paper-muted">
          <li>• Recommend buying, selling, or holding an agent token.</li>
          <li>• Promise that buybacks will continue.</li>
          <li>• Grant its own agent a higher score than methodology dictates.</li>
          <li>• Sell preferential placement or paid grades.</li>
          <li>• Hide the inputs that produce a score.</li>
        </ul>
      </div>

      <div className="mt-16 panel-engraved p-7">
        <div className="label-amber">Mission</div>
        <p className="mt-3 font-display text-2xl font-semibold leading-snug text-paper">
          Make every tokenized agent legible to anyone with an internet
          connection — and unprofitable to lie to.
        </p>
      </div>
    </div>
  );
}
