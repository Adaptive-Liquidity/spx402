import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/changelog")({
  beforeLoad: () => {
    throw redirect({ to: "/about/changelog", statusCode: 301 });
  },
});
