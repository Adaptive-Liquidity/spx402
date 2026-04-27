import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  type AgentCategory,
  type IdentifierKind,
} from "@/lib/agents/categories";
import { ArrowRight, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register your agent — SPX402" },
      {
        name: "description",
        content:
          "Register any Solana agent on SPX402 — tokenized buyback, MPL-registered, x402 executor wallet, copy-trader, or task executor. Live SPX Execution Score within ~10 minutes.",
      },
      { property: "og:title", content: "Register your agent — SPX402" },
      {
        property: "og:description",
        content:
          "Mint, MPL Core asset, or executor wallet — paste it once and SPX402 indexes the rest.",
      },
    ],
  }),
  component: RegisterPage,
});

// Validate base58 Solana address (32–44 chars).
function isValidBase58Address(v: string): boolean {
  if (v.length < 32 || v.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(v);
}

function RegisterPage() {
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [category, setCategory] = useState<AgentCategory>("tokenized_buyback");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "ok"; identifier: string }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  // The chosen category dictates which on-chain identifier kind we store.
  const selectedMeta = useMemo(
    () => CATEGORIES.find((c) => c.id === category)!,
    [category],
  );
  const identifierKind: IdentifierKind = selectedMeta.identifierKind;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setStatus({ kind: "err", message: "Sign in to register an agent." });
      return;
    }
    const trimmed = identifier.trim();
    if (!isValidBase58Address(trimmed)) {
      setStatus({
        kind: "err",
        message:
          "Address must be a base58 Solana address (32–44 chars). Mint, MPL Core asset, or executor wallet all work.",
      });
      return;
    }
    setStatus({ kind: "submitting" });

    // Build the candidate row using the canonical column shape.
    const row: {
      mint: string;
      submitted_by: string;
      discovered_via: "manual_submit";
      status: "pending";
      notes: string | null;
      identifier_kind: IdentifierKind;
      category: AgentCategory;
      executor_wallet: string | null;
      core_asset: string | null;
      signals: Record<string, unknown>;
    } = {
      mint: trimmed,
      submitted_by: user.id,
      discovered_via: "manual_submit",
      status: "pending",
      notes: notes.trim() || null,
      identifier_kind: identifierKind,
      category,
      executor_wallet: identifierKind === "executor_wallet" ? trimmed : null,
      core_asset: identifierKind === "core_asset" ? trimmed : null,
      signals: { source: "register_form" },
    };

    const { error } = await supabase.from("candidate_agents").insert([row]);
    if (error) {
      setStatus({
        kind: "err",
        message: error.message.includes("duplicate")
          ? "That address is already in the queue."
          : error.message,
      });
      return;
    }
    setStatus({ kind: "ok", identifier: trimmed });
    setNotes("");
  };

  const dossierUrl =
    status.kind === "ok"
      ? `${typeof window !== "undefined" ? window.location.origin : "https://spx402.com"}/agent/${status.identifier}`
      : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      <div className="label-amber">Register</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        Put your agent on the tape.
      </h1>
      <p className="mt-4 text-lg text-paper-muted">
        Three steps: pick a category, paste the on-chain identifier, queue for
        verification. SPX402 indexes your execution history and publishes a live
        dossier.
      </p>
      <p className="mt-3 font-mono text-sm text-wire">
        Tokenized buyback, MPL-registered agent, x402 wallet, copy-trader, task
        executor — same flow for all of them.
      </p>

      {!user && (
        <div className="mt-8 border border-amber/60 bg-amber/10 p-4 font-mono text-sm text-amber">
          Sign in first to register.{" "}
          <Link to="/login" className="underline">
            Log in
          </Link>
          {" · "}
          <Link to="/signup" className="underline">
            Create account
          </Link>
        </div>
      )}

      {status.kind === "ok" ? (
        <div className="panel-engraved mt-8 p-7">
          <div className="label-amber">Step 3 · Queued</div>
          <h2 className="mt-3 font-display text-2xl font-bold text-paper">
            You&apos;re on the tape.
          </h2>
          <p className="mt-3 text-paper-muted">
            Your agent is now in the SPX402 verification queue. First score
            expected in ~10 min once activity is detected.
          </p>
          <div className="mt-6 flex items-center gap-2 border border-bronze/60 bg-panel-deep px-3 py-2.5">
            <code className="flex-1 truncate font-mono text-xs text-paper">
              {dossierUrl}
            </code>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator === "undefined") return;
                navigator.clipboard.writeText(dossierUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 border border-amber/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber hover:bg-amber/10"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/agent/$mint"
              params={{ mint: status.identifier }}
              className="inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
            >
              Open dossier <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
            >
              See the leaderboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setStatus({ kind: "idle" });
                setIdentifier("");
              }}
              className="inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
            >
              Register another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          {/* Step 1 — Category drives the rest of the form */}
          <div className="panel-engraved p-6">
            <div className="label-amber">Step 1 · Category</div>
            <p className="mt-2 text-sm text-paper-muted">
              Categories tune which pillars dominate your score and tell the
              indexer which on-chain identifier to expect.
            </p>
            <div className="mt-4 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => c.decoderLive && setCategory(c.id)}
                    disabled={!c.decoderLive}
                    className={`relative bg-panel p-4 text-left transition-colors ${
                      active
                        ? "ring-1 ring-inset ring-amber"
                        : c.decoderLive
                          ? "hover:bg-panel-deep"
                          : "opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-display text-base font-semibold ${active ? "text-amber" : "text-paper"}`}
                      >
                        {c.longLabel}
                      </span>
                      {!c.decoderLive && (
                        <span className="border border-bronze/60 bg-panel-deep px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-wire">
                          Phase 2
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-paper-muted">{c.blurb}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-wire">
                      Identifier · {c.identifierLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 — Identifier label adapts to chosen category */}
          <div className="panel-engraved p-6">
            <div className="label-amber">Step 2 · {selectedMeta.identifierLabel}</div>
            <label className="label-mono mt-3 block" htmlFor="identifier">
              {selectedMeta.identifierLabel} address
            </label>
            <input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                identifierKind === "mint"
                  ? "So11111111111111111111111111111111111111112"
                  : identifierKind === "core_asset"
                    ? "MPL Core asset pubkey"
                    : "Executor wallet pubkey"
              }
              className="mt-2 w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber"
              spellCheck={false}
              autoComplete="off"
            />
            <p className="mt-2 font-mono text-[11px] text-wire">
              {identifierKind === "mint"
                ? "SPL token mint. SPX402 will resolve protocol, deposit address, and authority."
                : identifierKind === "core_asset"
                  ? "MPL Core asset address. SPX402 verifies the AgentIdentity PDA on-chain."
                  : "Wallet address used to execute on-chain. SPX402 indexes swaps + x402 receipts."}
            </p>
          </div>

          <div className="panel-engraved p-6">
            <div className="label-amber">Step 3 · Optional context</div>
            <label className="label-mono mt-3 block" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know? Operator wallet, registry tx, agent skills."
              maxLength={500}
              rows={3}
              className="mt-2 w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber"
            />
            <p className="mt-2 font-mono text-[11px] text-wire">
              Operator verification (Ed25519 signature) is a separate step from
              your dossier once indexed.
            </p>
          </div>

          <button
            type="submit"
            disabled={status.kind === "submitting" || !user}
            className="w-full border border-amber/80 bg-amber/10 px-5 py-3.5 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-50"
          >
            {status.kind === "submitting" ? "Queuing…" : "Queue for verification"}
          </button>
          {status.kind === "err" && (
            <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
              {status.message}
            </div>
          )}
        </form>
      )}

      <div className="mt-12 border-t border-bronze/40 pt-6 font-mono text-xs text-wire">
        Submissions are public. The queue, signals, and verification outcome are
        all visible — that&apos;s the whole point.
      </div>
    </div>
  );
}
