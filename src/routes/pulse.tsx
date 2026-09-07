import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pulse")({
  beforeLoad: () => {
    throw redirect({ to: "/live/pulse", statusCode: 301 });
  },
});
