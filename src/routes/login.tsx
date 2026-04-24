import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SPX402" },
      { name: "description", content: "Sign in to your SPX402 terminal." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return <AuthForm mode="login" />;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  return (
    <div className="mx-auto flex max-w-md flex-col items-stretch px-4 py-16 lg:py-24">
      <div className="label-amber text-center">
        {isSignup ? "Open Terminal" : "Sign in"}
      </div>
      <h1 className="mt-3 text-center font-display text-3xl font-bold text-paper">
        {isSignup ? "Create your operator account." : "Welcome back."}
      </h1>
      <p className="mt-3 text-center text-sm text-paper-muted">
        {isSignup
          ? "Free tier includes unlimited public dossier views."
          : "Resume monitoring your watched agents."}
      </p>

      <form className="panel-engraved mt-10 space-y-4 p-6">
        <div>
          <label className="label-mono mb-1.5 block">Email</label>
          <input
            type="email"
            className="w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper placeholder:text-wire focus:border-amber focus:outline-none"
            placeholder="operator@agent.xyz"
          />
        </div>
        <div>
          <label className="label-mono mb-1.5 block">Password</label>
          <input
            type="password"
            className="w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper placeholder:text-wire focus:border-amber focus:outline-none"
            placeholder="••••••••••"
          />
        </div>
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className="w-full border border-amber bg-amber py-3 font-mono text-xs uppercase tracking-widest text-panel-deep hover:bg-amber-dim"
        >
          {isSignup ? "Create account" : "Sign in"}
        </button>
        <div className="rule-bronze" />
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 border border-bronze/60 bg-panel-deep py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
        >
          ◎ Connect Solana wallet
        </button>
      </form>

      <p className="mt-6 text-center font-mono text-xs uppercase tracking-widest text-wire">
        {isSignup ? (
          <>Already have a terminal? <Link to="/login" className="text-amber hover:underline">Sign in</Link></>
        ) : (
          <>New here? <Link to="/signup" className="text-amber hover:underline">Open terminal</Link></>
        )}
      </p>

      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-wire">
        Demo mode · Authentication is not yet wired. Backend connects in next pass.
      </p>
    </div>
  );
}
