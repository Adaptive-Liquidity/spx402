import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer — SPX402" },
      { name: "description", content: "SPX402 provides operational transparency only. Not investment, legal, tax, or financial advice." },
    ],
  }),
  component: DisclaimerPage,
});

const SECTIONS = [
  {
    h: "Not investment, legal, tax, or financial advice",
    p: "SPX402 provides operational transparency based on observable on-chain data. Nothing on this site or in the API is investment, legal, tax, accounting, trading, or financial advice. Nothing here constitutes a solicitation to buy, sell, or hold any token or asset.",
  },
  {
    h: "Grades measure execution, not value",
    p: "SPX402 grades execution patterns, not token value. A high Transparency Score does not mean an agent token is safe, valuable, profitable, legitimate, or suitable to buy. A low Transparency Score does not prove fraud or wrongdoing.",
  },
  {
    h: "Buybacks and burns are not financial returns",
    p: "Buybacks may not occur, may occur irregularly, may stop entirely, and should not be treated as dividends, revenue sharing, profit distribution, or guaranteed financial returns. Tokenized agent mechanics are subject to operator decisions, on-chain conditions, and protocol changes.",
  },
  {
    h: "Data limitations",
    p: "SPX402 may miss events, misclassify transactions, experience indexing delays, or rely on incomplete data. Webhook delivery may lag. Reconciliation runs continuously, but no system is perfect. Always verify critical decisions against the underlying chain.",
  },
  {
    h: "No affiliation",
    p: "SPX402 is not affiliated with, endorsed by, or sponsored by S&P, Standard & Poor's, S&P Global, S&P Dow Jones Indices, or any of their subsidiaries. The brand name SPX402 references HTTP status code 402 (Payment Required), not any S&P index product.",
  },
  {
    h: "User responsibility",
    p: "Users are responsible for their own research, custody, and investment decisions. SPX402 is a transparency tool, not a custodian, exchange, or fiduciary. We strongly recommend consulting a qualified financial professional before making any decisions involving tokenized assets.",
  },
];

function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8 lg:py-24">
      <div className="label-amber">Disclaimer</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-paper">
        Read this carefully.
      </h1>
      <p className="mt-5 text-paper-muted">
        SPX402 is a public proof layer. It is not a financial product, a security,
        a regulated rating, or an investment recommendation. The plain-English
        terms below apply to every page, every dashboard, every API response, and
        every alert.
      </p>

      <div className="mt-12 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-xl font-bold text-paper">{s.h}</h2>
            <p className="mt-3 leading-relaxed text-paper-muted">{s.p}</p>
          </section>
        ))}
      </div>

      <div className="mt-16 border-l-2 border-bronze bg-panel-deep/60 p-5 font-mono text-xs uppercase tracking-widest text-wire">
        Last updated 24 April 2026 · SPX402 may revise this disclaimer at any time.
      </div>
    </div>
  );
}
