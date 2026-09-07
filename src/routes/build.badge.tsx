import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeSubscribe } from "@/components/spx/BadgeSubscribe";
import { BADGE_TIERS, HONEST_GRADE_RULE } from "@/lib/badge-plans";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/build/badge")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/build/badge" }],
    meta: [
      { property: "og:url", content: "https://spx402.com/build/badge" },
      { title: "Live badge — attested on Base · SPX402" },
      {
        name: "description",
        content:
          "Subscribe an agent to a live SPX402 badge. Every grade change is published as an on-chain attestation on Base, verifiable without trusting our servers.",
      },
      { property: "og:title", content: "SPX402 Live Badge · attested on Base" },
      {
        property: "og:description",
        content: "Paid monitoring, honest grades, on-chain attestations for every grade change.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://spx402.com/api/public/share.png" },
      { name: "twitter:image", content: "https://spx402.com/api/public/share.png" },
    ],
  }),
  component: BadgePage,
});

const STEPS = [
  {
    n: "01",
    title: "Pick a plan",
    body: "Standard or Premium, paid in USDC on Base from your own wallet. 30 days per payment.",
  },
  {
    n: "02",
    title: "Monitoring activates",
    body: "Your agent's badge goes live and shows the current grade instead of a static snapshot.",
  },
  {
    n: "03",
    title: "Grades get attested",
    body: "Every grade change is written as an Ethereum Attestation Service record on Base. No extra charge per attestation.",
  },
];

function BadgePage() {
  const { session } = useAuth();

  return (
    <div className="stage py-8">
      <div className="max-w-3xl">
                <h1 className="font-display text-3xl font-bold tracking-tight text-paper">
          A badge that costs more
          <br />
          <span className="text-amber">to fake than to earn.</span>
        </h1>
        <p className="mt-5 text-paper-muted">
          A subscribed badge tracks your agent's grade in real time, and SPX402 publishes a
          cryptographic attestation on Base every time that grade changes — verifiable on-chain,
          not just by trusting our servers.
        </p>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="bg-panel p-6">
            <div className="font-mono text-[10px] tracking-widest text-wire">{s.n}</div>
            <h2 className="mt-3 font-display text-xl font-semibold text-paper">{s.title}</h2>
            <p className="mt-2 text-sm text-paper-muted">{s.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="font-display text-3xl font-bold text-paper">Plans</h2>
        <p className="mt-2 max-w-2xl text-sm text-paper-muted">
          Priced per 30 days, per agent. You are charged once per period — attestations that follow
          a grade change are included.
        </p>
        {!session && (
          <div className="mt-5 border-l-2 border-amber/70 bg-amber/5 px-4 py-3 text-sm text-paper-muted">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber">
              Sign in required ·{" "}
            </span>
            A badge is tied to your account so you can manage or cancel it.{" "}
            <Link to="/login" className="text-amber underline underline-offset-2">
              Sign in
            </Link>{" "}
            or{" "}
            <Link to="/signup" className="text-amber underline underline-offset-2">
              create an account
            </Link>
            .
          </div>
        )}
        <div className="mt-6">
          <BadgeSubscribe />
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <div className="panel-engraved p-6">
          <div className="label-amber">What you can customize</div>
          <ul className="mt-4 space-y-2 text-sm text-paper-muted">
            <li>· Plan tier — {Object.values(BADGE_TIERS).map((t) => t.name).join(" or ")}</li>
            <li>· Which agent identifier the badge tracks</li>
            <li>· Where you embed it — site, docs, token page, community post</li>
            <li>· Badge styling options on Premium</li>
          </ul>
          <p className="mt-4 text-sm text-paper-muted">
            What you cannot change is the claim itself. The badge only prints what the scoring
            engine measured.
          </p>
        </div>
        <div className="panel-engraved p-6">
          <div className="label-amber">The honest grade rule</div>
          <p className="mt-4 border-l-2 border-amber/60 bg-panel-deep/40 px-3 py-3 font-mono text-[11px] leading-relaxed text-paper-muted">
            {HONEST_GRADE_RULE}
          </p>
          <Link
            to="/methodology"
            className="mt-5 inline-flex border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            Read the methodology →
          </Link>
        </div>
      </section>
    </div>
  );
}
