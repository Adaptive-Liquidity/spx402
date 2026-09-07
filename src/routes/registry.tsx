import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/spx/HubLayout";

export const Route = createFileRoute("/registry")({
  component: RegistryLayout,
});

function RegistryLayout() {
  return (
    <HubLayout
      eyebrow="REGISTRY"
      title="Every graded subject on the terminal"
      blurb="One index, four views: the ranked leaderboard, the full universe, everything we have flagged, and the operators behind them."
      tabs={[
        { to: "/registry", label: "Leaderboard" },
        { to: "/registry/explore", label: "Explore" },
        { to: "/registry/flagged", label: "Flagged" },
        { to: "/registry/operators", label: "Operators" },
      ]}
    />
  );
}
