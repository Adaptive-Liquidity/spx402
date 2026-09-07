import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/flagged")({
  beforeLoad: () => {
    throw redirect({ to: "/registry/flagged", statusCode: 301 });
  },
});
