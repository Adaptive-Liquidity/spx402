import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorCounts } from "@/lib/operator-counts";
import { CopyButton } from "@/components/spx/CopyButton";

export const Route = createFileRoute("/_authenticated/dashboard/account")({
  head: () => ({
    meta: [
      { title: "Account — SPX402 Operator Terminal" },
      {
        name: "description",
        content: "Manage your SPX402 identity, password, plan and account record.",
      },
    ],
  }),
  component: AccountPage,
});

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

function Notice({ tone, children }: { tone: "ok" | "bad"; children: React.ReactNode }) {
  return (
    <div
      className={
        tone === "ok"
          ? "border-l-2 border-verified/70 bg-verified/10 px-3 py-2 font-mono text-xs text-verified"
          : "border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical"
      }
    >
      {children}
    </div>
  );
}

function Band({
  n,
  code,
  children,
}: {
  n: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="band-spine">
        <b>{n}</b>
        <span>// {code}</span>
      </div>
      <div className="mt-3 h-px w-full bg-bronze/40" />
      <div className="mt-6">{children}</div>
    </section>
  );
}

function AccountPage() {
  const { user, signOut } = useAuth();
  const counts = useOperatorCounts(user?.id);

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setDisplayName((user?.user_metadata?.display_name as string) ?? "");
  }, [user?.id]);

  const saveName = async () => {
    setSavingName(true);
    setNameMsg(null);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    });
    setSavingName(false);
    setNameMsg(
      error
        ? { tone: "bad", text: error.message }
        : { tone: "ok", text: "Display name recorded." },
    );
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (pw.length < 8) {
      setPwMsg({ tone: "bad", text: "Password must be at least 8 characters." });
      return;
    }
    if (pw !== pw2) {
      setPwMsg({ tone: "bad", text: "The two entries do not match." });
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) {
      setPwMsg({ tone: "bad", text: error.message });
      return;
    }
    setPw("");
    setPw2("");
    setPwMsg({ tone: "ok", text: "Password changed. Other sessions stay signed in." });
  };

  const requestDeletion = async () => {
    setDeleteMsg(null);
    if (confirmDelete.trim().toUpperCase() !== "DELETE") {
      setDeleteMsg({ tone: "bad", text: "Type DELETE to confirm." });
      return;
    }
    setDeleting(true);
    const { error } = await supabase.auth.updateUser({
      data: { deletion_requested_at: new Date().toISOString() },
    });
    setDeleting(false);
    setDeleteMsg(
      error
        ? { tone: "bad", text: error.message }
        : {
            tone: "ok",
            text: "Deletion requested. Your watchlist, alerts and keys are scheduled for removal.",
          },
    );
    setConfirmDelete("");
  };

  const lastChanged = (user as unknown as { updated_at?: string } | null)?.updated_at;

  return (
    <div className="space-y-12">
      <Band n="01" code="IDENTITY">
        <div className="panel-engraved divide-y divide-bronze/30">
          <div className="grid gap-4 p-5 sm:grid-cols-[10rem_1fr] sm:items-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-wire">
              Display name
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Unnamed operator"
                className="field-terminal max-w-xs"
              />
              <button onClick={saveName} disabled={savingName} className="btn-caliper">
                {savingName ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <div className="grid gap-2 p-5 sm:grid-cols-[10rem_1fr] sm:items-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-wire">Email</div>
            <div className="font-mono text-sm text-paper">{user?.email}</div>
          </div>
          <div className="grid gap-2 p-5 sm:grid-cols-[10rem_1fr] sm:items-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-wire">
              Account opened
            </div>
            <div className="font-mono text-sm text-paper-muted">{fmtDate(user?.created_at)}</div>
          </div>
          <div className="grid gap-2 p-5 sm:grid-cols-[10rem_1fr] sm:items-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-wire">
              Account reference
            </div>
            <div className="flex items-center gap-3">
              <code className="overflow-x-auto whitespace-nowrap font-mono text-xs text-paper-muted">
                {user?.id}
              </code>
              {user?.id ? <CopyButton value={user.id} /> : null}
            </div>
          </div>
        </div>
        {nameMsg ? (
          <div className="mt-4">
            <Notice tone={nameMsg.tone}>{nameMsg.text}</Notice>
          </div>
        ) : null}
      </Band>

      <Band n="02" code="SECURITY">
        <div className="panel-engraved p-5">
          <p className="max-w-xl text-sm text-paper-muted">
            Set a new password for this account. Last change on file:{" "}
            <span className="font-mono text-paper">{fmtDate(lastChanged)}</span>.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:max-w-xl">
            <label>
              <span className="label-mono">New password</span>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                className="field-terminal mt-2"
              />
            </label>
            <label>
              <span className="label-mono">Confirm</span>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
                className="field-terminal mt-2"
              />
            </label>
          </div>
          <button
            onClick={savePassword}
            disabled={savingPw}
            className="btn-caliper btn-caliper-primary mt-5"
          >
            {savingPw ? "Updating…" : "Change password"}
          </button>
          {pwMsg ? (
            <div className="mt-4">
              <Notice tone={pwMsg.tone}>{pwMsg.text}</Notice>
            </div>
          ) : null}
        </div>
      </Band>

      <Band n="03" code="ACCESS">
        <div className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-2">
          <div className="bg-panel p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-wire">
              Current plan
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-paper">Free</div>
            <p className="mt-3 text-sm text-paper-muted">
              Full read access to every dossier, the tape and the public verified feed, plus API
              keys on the free rate limit.
            </p>
            <Link to="/pricing" className="btn-caliper mt-5">
              Compare plans →
            </Link>
          </div>
          <div className="bg-panel p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-wire">
              API keys
            </div>
            <div className="mt-2 font-display text-2xl font-bold tabular-nums text-paper">
              {counts === null ? <span className="skel inline-block h-7 w-10" /> : counts.keysActive}
            </div>
            <p className="mt-3 text-sm text-paper-muted">
              Active keys authenticating against the v1 endpoints. Secrets are stored only as
              hashes.
            </p>
            <Link to="/dashboard/api-keys" className="btn-caliper mt-5">
              Manage keys →
            </Link>
          </div>
        </div>
      </Band>

      <Band n="04" code="TERMINATION">
        <div className="panel-engraved border-l-2 border-critical/60 p-5">
          <h3 className="font-display text-lg font-bold text-paper">Close this account.</h3>
          <p className="mt-3 max-w-xl text-sm text-paper-muted">
            Requesting deletion removes your watchlist, alert subscriptions and API keys. Public
            on-chain evidence is not affected — SPX402 never deletes the ledger, only your record of
            it.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder="Type DELETE"
              aria-label="Type DELETE to confirm"
              className="field-terminal max-w-[12rem]"
            />
            <button
              onClick={requestDeletion}
              disabled={deleting}
              className="btn-caliper btn-caliper-danger"
            >
              {deleting ? "Filing…" : "Request deletion"}
            </button>
            <button onClick={() => signOut()} className="btn-caliper">
              Sign out
            </button>
          </div>
          {deleteMsg ? (
            <div className="mt-4">
              <Notice tone={deleteMsg.tone}>{deleteMsg.text}</Notice>
            </div>
          ) : null}
        </div>
      </Band>
    </div>
  );
}
