import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/spx/HubLayout";

export const Route = createFileRoute("/build")({
  component: BuildLayout,
});

function BuildLayout() {
  return (
    <HubLayout
      eyebrow="BUILD"
      title="Integrate SPX402"
      blurb="Execution data for agents: the API and its endpoints, the endpoint preflight checker, the live badge, alerts, and agent registration."
      tabs={[
        { to: "/build", label: "API" },
        { to: "/build/docs", label: "Endpoints" },
        { to: "/build/preflight", label: "Preflight" },
        { to: "/build/badge", label: "Live badge" },
        { to: "/build/alerts", label: "Alerts" },
        { to: "/build/register", label: "Register" },
      ]}
    />
  );
}
