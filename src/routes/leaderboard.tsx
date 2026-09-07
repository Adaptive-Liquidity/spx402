import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/leaderboard")({
  beforeLoad: () => {
    throw redirect({ to: "/registry", statusCode: 301 });
  },
});
