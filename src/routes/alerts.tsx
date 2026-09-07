import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/alerts")({
  beforeLoad: () => {
    throw redirect({ to: "/build/alerts", statusCode: 301 });
  },
});
