import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SPX402" },
      { name: "description", content: "Your SPX402 operator terminal." },
    ],
  }),
  component: () => <Outlet />,
});
