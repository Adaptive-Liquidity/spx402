import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/api")({
  beforeLoad: ({ location }) => {
    const to = location.pathname.replace(/\/$/, "").endsWith("/docs")
      ? "/build/docs"
      : "/build";
    throw redirect({ to, statusCode: 301 });
  },
});
