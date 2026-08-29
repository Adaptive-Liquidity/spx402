import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/spx/ComingSoon";

export const Route = createFileRoute("/_authenticated/dashboard/api-keys")({
  head: () => ({
    meta: [{ title: "API keys — SPX402" }],
  }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label-amber">API Keys</div>
          <h2 className="mt-2 font-display text-2xl font-bold text-paper">Issued keys</h2>
          <p className="mt-2 max-w-xl font-mono text-xs text-paper-muted">
            REST keys for the SPX402 v1 API. x402 pay-per-call endpoints require no key — see{" "}
            <span className="text-paper">/api/docs</span>.
          </p>
        </div>
        <ComingSoon label="Coming soon">
          <span className="inline-flex items-center border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber">
            + Generate key
          </span>
        </ComingSoon>
      </div>

      <div className="panel-engraved overflow-hidden">
        <div className="grid grid-cols-12 gap-4 border-b border-bronze/40 bg-panel-deep/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-wire">
          <div className="col-span-4">Label</div>
          <div className="col-span-4">Key prefix</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="px-5 py-12 text-center font-mono text-xs uppercase tracking-widest text-wire">
          No keys issued
        </div>
      </div>

      <div className="border-l-2 border-amber/70 bg-amber/5 p-4 text-sm text-paper-muted">
        <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Note · </span>
        Free tier will include 1,000 calls/month. Pay-per-call x402 endpoints require no key — see{" "}
        <span className="font-mono text-paper">/api/docs</span>.
      </div>
    </div>
  );
}
