import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/spx/SiteHeader";
import { SiteFooter } from "@/components/spx/SiteFooter";
import { TickerTape } from "@/components/spx/TickerTape";
import { AuthProvider } from "@/lib/auth";

function NotFoundComponent() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
      <div className="border border-critical/70 bg-critical/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-critical flicker-404">
        SPX404
      </div>
      <h1 className="mt-8 font-display text-5xl font-bold text-paper">Route not found.</h1>
      <p className="mt-4 max-w-lg font-mono text-sm text-paper-muted">
        We do not grade ghosts without receipts. The page you requested does not exist in this
        terminal.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
      >
        Return to terminal
      </a>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SPX402 — Execution Grade for Tokenized AI Agents" },
      {
        name: "description",
        content:
          "Verify tokenized agent deposits, buybacks, burns, anomalies, and operator execution. No hype. Just receipts.",
      },
      { name: "author", content: "SPX402" },
      { property: "og:title", content: "SPX402 — Execution Grade for Tokenized AI Agents" },
      {
        property: "og:description",
        content:
          "Payment required. Proof provided. The execution-grade terminal for tokenized AI agents on Solana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@SPX402" },
      { name: "twitter:title", content: "SPX402 — Execution Grade for Tokenized AI Agents" },
      {
        name: "description",
        content:
          "SPX402 verifies tokenized AI agents by reading the only witness that does not care about narratives: the chain. Paste a mint. See deposits, buybacks, burns, con",
      },
      {
        property: "og:description",
        content:
          "SPX402 verifies tokenized AI agents by reading the only witness that does not care about narratives: the chain. Paste a mint. See deposits, buybacks, burns, con",
      },
      {
        name: "twitter:description",
        content:
          "SPX402 verifies tokenized AI agents by reading the only witness that does not care about narratives: the chain. Paste a mint. See deposits, buybacks, burns, con",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/I7YmU8IgqxZ3J8UORUMA2UpyL7Z2/social-images/social-1777245368096-8K_unreal_engine_202604241532_(1).webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/I7YmU8IgqxZ3J8UORUMA2UpyL7Z2/social-images/social-1777245368096-8K_unreal_engine_202604241532_(1).webp",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <TickerTape />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </AuthProvider>
  );
}
