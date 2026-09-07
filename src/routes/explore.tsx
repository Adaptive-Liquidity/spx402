import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/explore")({
  beforeLoad: () => {
    throw redirect({ to: "/registry/explore", statusCode: 301 });
  },
});
