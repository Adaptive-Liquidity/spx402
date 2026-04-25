import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";

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
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if ("error" in result && result.error) {
      setError(result.error.message);
    }
  };

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

      <form onSubmit={submit} className="panel-engraved mt-10 space-y-4 p-6">
        {isSignup && (
          <div>
            <label className="label-mono mb-1.5 block">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper placeholder:text-wire focus:border-amber focus:outline-none"
              placeholder="operator_01"
            />
          </div>
        )}
        <div>
          <label className="label-mono mb-1.5 block">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper placeholder:text-wire focus:border-amber focus:outline-none"
            placeholder="operator@agent.xyz"
          />
        </div>
        <div>
          <label className="label-mono mb-1.5 block">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper placeholder:text-wire focus:border-amber focus:outline-none"
            placeholder="••••••••••"
          />
        </div>

        {error && (
          <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
            {error}
          </div>
        )}
        {info && (
          <div className="border-l-2 border-verified/70 bg-verified/10 px-3 py-2 font-mono text-xs text-verified">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full border border-amber bg-amber py-3 font-mono text-xs uppercase tracking-widest text-panel-deep hover:bg-amber-dim disabled:opacity-50"
        >
          {busy ? "…" : isSignup ? "Create account" : "Sign in"}
        </button>
        <div className="rule-bronze" />
        <button
          type="button"
          onClick={google}
          className="flex w-full items-center justify-center gap-2 border border-bronze/60 bg-panel-deep py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
        >
          Continue with Google
        </button>
      </form>

      <p className="mt-6 text-center font-mono text-xs uppercase tracking-widest text-wire">
        {isSignup ? (
          <>Already have a terminal? <Link to="/login" className="text-amber hover:underline">Sign in</Link></>
        ) : (
          <>New here? <Link to="/signup" className="text-amber hover:underline">Open terminal</Link></>
        )}
      </p>
    </div>
  );
}
