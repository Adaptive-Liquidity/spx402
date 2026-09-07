import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/preflight")({
  beforeLoad: () => {
    throw redirect({ to: "/build/preflight", statusCode: 301 });
  },
});
