import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/operators")({
  beforeLoad: () => {
    throw redirect({ to: "/registry/operators", statusCode: 301 });
  },
});
