import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  createApiKey,
  fetchApiKeys,
  revokeApiKey,
  TIER_LIMITS,
  type ApiKeyRow,
} from "@/lib/api-keys";
import { EmptyState } from "@/components/spx/EmptyState";
import { CopyButton } from "@/components/spx/CopyButton";

export const Route = createFileRoute("/_authenticated/dashboard/api-keys")({
  head: () => ({
    meta: [
      { title: "API keys — SPX402" },
      {
        name: "description",
        content: "Issue and revoke SPX402 API keys and watch their call volume.",
      },
    ],
  }),
  component: ApiKeysPage,
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

function ApiKeysPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      setKeys(await fetchApiKeys(user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keys");
      setKeys([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const generate = async () => {
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const { row, secret: raw } = await createApiKey(name);
      setKeys((prev) => [row, ...(prev ?? [])]);
      setSecret(raw);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setError(null);
    try {
      await revokeApiKey(id);
      setKeys(
        (prev) =>
          prev?.map((k) =>
            k.id === id ? { ...k, status: "revoked", revoked_at: new Date().toISOString() } : k,
          ) ?? null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke key");
    }
  };

  const active = (keys ?? []).filter((k) => k.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <div className="label-amber">API Keys</div>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper">Issued keys</h2>
        <p className="mt-2 max-w-xl text-sm text-paper-muted">
          REST keys for the SPX402 v1 API. Pay-per-call x402 endpoints need no key. Free keys allow{" "}
          {TIER_LIMITS.free} calls per day.
        </p>
      </div>

      {error && (
        <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {error}
        </div>
      )}

      {secret && (
        <div className="border-l-2 border-amber/70 bg-amber/5 p-4">
          <div className="label-amber">Copy this now — it is shown once</div>
          <div className="mt-3 flex items-center gap-3">
            <code className="flex-1 overflow-x-auto whitespace-nowrap bg-panel-deep/60 px-3 py-2 font-mono text-xs text-paper">
              {secret}
            </code>
            <CopyButton value={secret} />
          </div>
          <button
            onClick={() => setSecret(null)}
            className="mt-3 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:text-amber"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="panel-engraved flex flex-wrap items-end gap-3 p-5">
        <label className="flex-1 min-w-[200px]">
          <span className="label-mono">Key label</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="production"
            className="mt-2 w-full border border-bronze/50 bg-panel-deep/60 px-3 py-2 font-mono text-sm text-paper outline-none focus:border-amber"
          />
        </label>
        <div className="pb-1 font-mono text-[10px] uppercase tracking-widest text-wire">
          Free tier · {TIER_LIMITS.free}/day
        </div>
        <button
          onClick={generate}
          disabled={creating}
          className="border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-50"
        >
          {creating ? "Generating…" : "+ Generate key"}
        </button>
      </div>

      {keys === null ? (
        <div className="panel-engraved p-12 text-center font-mono text-xs uppercase tracking-widest text-wire">
          Loading…
        </div>
      ) : keys.length === 0 ? (
        <EmptyState
          label="No keys issued"
          title="Nothing to authenticate with yet."
          body="Generate a key above to call the v1 endpoints. The secret is shown once and stored only as a hash."
        />
      ) : (
        <div className="panel-engraved overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-bronze/40 bg-panel-deep/60 font-mono text-[10px] uppercase tracking-widest text-wire">
                <th className="px-5 py-3 text-left">Label</th>
                <th className="px-5 py-3 text-left">Prefix</th>
                <th className="px-5 py-3 text-left">Daily limit</th>
                <th className="px-5 py-3 text-left">Created</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bronze/30">
              {keys.map((k) => (
                <tr key={k.id} className="font-mono text-xs text-paper-muted">
                  <td className="px-5 py-4 text-paper">{k.name}</td>
                  <td className="px-5 py-4">{k.key_prefix}…</td>
                  <td className="px-5 py-4">{k.daily_limit.toLocaleString()}</td>
                  <td className="px-5 py-4">{fmtDate(k.created_at)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        k.status === "active"
                          ? "text-verified uppercase tracking-widest"
                          : "text-wire uppercase tracking-widest"
                      }
                    >
                      {k.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {k.status === "active" ? (
                      <button
                        onClick={() => revoke(k.id)}
                        className="border border-bronze/60 px-2.5 py-1.5 text-[10px] uppercase tracking-widest hover:border-critical hover:text-critical"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-wire">
                        Revoked {fmtDate(k.revoked_at)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-l-2 border-amber/70 bg-amber/5 p-4 text-sm text-paper-muted">
        <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Note · </span>
        {active.length} active {active.length === 1 ? "key" : "keys"}. Send it as{" "}
        <span className="font-mono text-paper">Authorization: Bearer &lt;key&gt;</span>.
      </div>
    </div>
  );
}
