import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit an agent — SPX402" },
      {
        name: "description",
        content:
          "Paste a Solana mint and SPX402 will queue it for on-chain verification. We only list agents with verified earnings AND identity proof.",
      },
      { property: "og:title", content: "Submit an agent — SPX402" },
      {
        property: "og:description",
        content:
          "Public submission queue. Watch verification happen in real time.",
      },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const { user } = useAuth();
  const [mint, setMint] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "ok"; mint: string }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setStatus({ kind: "err", message: "Sign in to submit an agent." });
      return;
    }
    const trimmed = mint.trim();
    if (trimmed.length < 32 || trimmed.length > 44) {
      setStatus({
        kind: "err",
        message: "Mint must be a base58 Solana address (32–44 chars).",
      });
      return;
    }
    setStatus({ kind: "submitting" });
    const { error } = await supabase.from("candidate_agents").insert({
      mint: trimmed,
      submitted_by: user.id,
      discovered_via: "manual_submit",
      status: "pending",
      notes: notes.trim() || null,
    });
    if (error) {
      setStatus({
        kind: "err",
        message: error.message.includes("duplicate")
          ? "That mint is already in the queue."
          : error.message,
      });
      return;
    }
    setStatus({ kind: "ok", mint: trimmed });
    setMint("");
    setNotes("");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      <div className="label-amber">Submission queue</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-paper">
        Submit a tokenized agent.
      </h1>
      <p className="mt-4 text-paper-muted">
        Paste a Solana mint. SPX402 will queue it for the verifier, which
        runs four on-chain checks: <span className="text-paper">Skills.md</span> in metadata,
        <span className="text-paper"> Invoice ID PDA</span> derivation, an observed
        <span className="text-paper"> deposit → buyback → burn loop</span>, and a
        <span className="text-paper"> Solana Agent Registry</span> entry.
      </p>
      <p className="mt-3 font-mono text-sm text-wire">
        We only promote agents that earn on-chain AND carry at least one identity proof.
      </p>

      {!user && (
        <div className="mt-8 border border-amber/60 bg-amber/10 p-4 font-mono text-sm text-amber">
          Sign in first to submit a mint.{" "}
          <Link to="/login" className="underline">Log in</Link>
        </div>
      )}

      <form onSubmit={onSubmit} className="panel-engraved mt-8 space-y-4 p-6">
        <div>
          <label className="label-mono" htmlFor="mint">Mint address</label>
          <input
            id="mint"
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="So11111111111111111111111111111111111111112"
            className="mt-2 w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label-mono" htmlFor="notes">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything we should know about this agent? (max 500 chars)"
            maxLength={500}
            rows={3}
            className="mt-2 w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber"
          />
        </div>
        <button
          type="submit"
          disabled={status.kind === "submitting" || !user}
          className="w-full border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-50"
        >
          {status.kind === "submitting" ? "Queuing…" : "Queue for verification"}
        </button>
        {status.kind === "ok" && (
          <div className="border-l-2 border-verified/70 bg-verified/10 px-3 py-2 font-mono text-xs text-verified">
            Queued. {status.mint.slice(0, 6)}…{status.mint.slice(-4)} will be checked
            within 5 minutes.
          </div>
        )}
        {status.kind === "err" && (
          <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
            {status.message}
          </div>
        )}
      </form>

      <div className="mt-10 font-mono text-xs text-wire">
        Submissions are public. Anyone can see the queue and watch verification
        signals light up in real time.
      </div>
    </div>
  );
}
