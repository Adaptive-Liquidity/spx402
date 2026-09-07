import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/api/docs")({
  beforeLoad: () => {
    throw redirect({ to: "/build/docs", statusCode: 301 });
  },
});
