import { createFileRoute } from "@tanstack/react-router";
import { HubLayout } from "@/components/spx/HubLayout";

export const Route = createFileRoute("/about")({
  component: AboutLayout,
});

function AboutLayout() {
  return (
    <HubLayout
      eyebrow="ABOUT"
      title="What SPX402 is, and what changed"
      blurb="The story behind the terminal, the running record of methodology updates, and the limits of what our grades claim."
      tabs={[
        { to: "/about", label: "Story" },
        { to: "/about/changelog", label: "Changelog" },
        { to: "/about/disclaimer", label: "Disclaimer" },
      ]}
    />
  );
}
