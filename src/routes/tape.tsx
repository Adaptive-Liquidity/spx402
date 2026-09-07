import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tape")({
  beforeLoad: () => {
    throw redirect({ to: "/live", statusCode: 301 });
  },
});
