import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Open Terminal — SPX402" },
      { name: "description", content: "Create your SPX402 operator account." },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
