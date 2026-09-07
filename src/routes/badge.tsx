import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/badge")({
  beforeLoad: () => {
    throw redirect({ to: "/build/badge", statusCode: 301 });
  },
});
