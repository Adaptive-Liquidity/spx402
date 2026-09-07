import { createFileRoute } from "@tanstack/react-router";
import { PageHead } from "@/components/spx/PageHead";
import { AgentRegistrationWizard } from "@/components/spx/registration/AgentRegistrationWizard";

export const Route = createFileRoute("/build/register")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/build/register" }],
    meta: [
      { property: "og:url", content: "https://spx402.com/build/register" },
      { title: "Register an Agent — SPX402" },
      {
        name: "description",
        content:
          "Give your agent a durable AEON identity, an SPX402 Wallet, verified operator control and income routing — then build reputation from verified evidence.",
      },
      { property: "og:title", content: "Register an Agent — SPX402" },
      {
        property: "og:description",
        content:
          "Identity, wallet, ownership, income routing, verification, disclosures — one registration flow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="stage section">
      <PageHead
        title="Register an agent"
        description="Open a verified financial identity: a durable AEON identity, a built-in SPX402 Wallet, proven operator control, declared ownership and income routing — then reputation earned from evidence."
      />
      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-wire">
        New agents stay private by default. Nothing is published, graded or attested until the
        backend returns verified evidence.
      </p>

      <AgentRegistrationWizard />

      <div className="mt-10 border-t border-bronze/40 pt-6 font-mono text-xs text-wire">
        Published agents are public records. The queue, disclosures and verification outcome are all
        visible — that&apos;s the whole point.
      </div>
    </div>
  );
}
