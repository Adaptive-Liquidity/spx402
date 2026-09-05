import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { getWalletAuthMessage, verifyWalletSignature } from "@/lib/wallet-auth.functions";
import { WalletPicker } from "@/components/WalletPicker";
import type { DetectedWallet, InjectedProvider } from "@/lib/wallets";

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

  const oauth = async (provider: "google" | "apple") => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if ("error" in result && result.error) {
      setError(result.error.message);
    }
  };

  const [showWalletPicker, setShowWalletPicker] = useState(false);

  const walletSignIn = async (selected: DetectedWallet) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const eth: InjectedProvider = selected.provider;
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const wallet = accounts[0];
      if (!wallet) throw new Error("No wallet account selected.");
      const origin = window.location.origin;
      const { message } = await getWalletAuthMessage({ data: { wallet, origin } });
      const signature = (await eth.request({
        method: "personal_sign",
        params: [message, wallet],
      })) as string;
      const creds = await verifyWalletSignature({ data: { wallet, signature, origin } });
      const { error: signInError } = await supabase.auth.signInWithPassword(creds);
      if (signInError) throw signInError;
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-stretch px-4 py-16 lg:py-24">
      <div className="label-amber text-center">{isSignup ? "Open Terminal" : "Sign in"}</div>
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
          onClick={walletSignIn}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 border border-amber/70 bg-panel-deep py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
          {busy ? "…" : "Sign in with Base"}
        </button>
        <button
          type="button"
          onClick={() => oauth("google")}
          className="flex w-full items-center justify-center gap-2 border border-bronze/60 bg-panel-deep py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => oauth("apple")}
          className="flex w-full items-center justify-center gap-2 border border-bronze/60 bg-panel-deep py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M16.365 1.43c0 1.14-.43 2.22-1.21 3.01-.81.83-2.12 1.47-3.21 1.38-.13-1.1.42-2.24 1.18-3.02.83-.86 2.24-1.5 3.24-1.37zM20.5 17.36c-.55 1.27-.81 1.84-1.51 2.97-.98 1.57-2.36 3.53-4.07 3.55-1.52.02-1.91-.99-3.97-.98-2.06.01-2.49 1-4.01.98-1.71-.02-3.02-1.78-4-3.35C.6 15.97-.04 11.4 1.74 8.36c1.26-2.16 3.25-3.43 5.11-3.43 1.9 0 3.09 1.04 4.66 1.04 1.52 0 2.45-1.04 4.65-1.04 1.66 0 3.42.91 4.67 2.47-4.1 2.25-3.43 8.1.67 9.96z" />
          </svg>
          Continue with Apple
        </button>
      </form>

      <p className="mt-6 text-center font-mono text-xs uppercase tracking-widest text-wire">
        {isSignup ? (
          <>
            Already have a terminal?{" "}
            <Link to="/login" className="text-amber hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link to="/signup" className="text-amber hover:underline">
              Open terminal
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
