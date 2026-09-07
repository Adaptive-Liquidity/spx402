import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/spx/HubLayout";

export const Route = createFileRoute("/live")({
  component: LiveLayout,
});

function LiveLayout() {
  return (
    <HubLayout
      eyebrow="LIVE"
      title="What is happening right now"
      blurb="The settlement tape, score movements and failures as they land, and the health of every indexer that feeds them."
      tabs={[
        { to: "/live", label: "Tape" },
        { to: "/live/pulse", label: "Pulse" },
        { to: "/live/status", label: "System status" },
      ]}
    />
  );
}
