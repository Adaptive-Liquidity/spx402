import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  fetchChangelog,
  formatReleaseDate,
  type ChangelogEntry,
} from "@/lib/live-data";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — SPX402" },
      { name: "description", content: "Product and methodology updates." },
    ],
  }),
  loader: async () => ({ entries: await fetchChangelog() }),
  staleTime: 60_000,
  component: ChangelogPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="label-amber">Changelog error</div>
        <p className="mt-3 text-paper-muted">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          Retry
        </button>
      </div>
    );
  },
});

const TYPE_COLORS: Record<string, string> = {
  parser: "text-amber border-amber/70",
  product: "text-verified border-verified/70",
  methodology: "text-paper border-paper/70",
  api: "text-verified border-verified/70",
  dashboard: "text-paper border-paper/70",
  scoring: "text-amber border-amber/70",
};

function ChangelogPage() {
  const { entries } = Route.useLoaderData() as { entries: ChangelogEntry[] };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8 lg:py-24">
      <div className="label-amber">Changelog</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-paper">
        Every parser version, on the record.
      </h1>
      <p className="mt-4 text-paper-muted">
        Every methodology change is timestamped. Old scores can be replayed against
        the parser version that produced them.
      </p>

      {entries.length === 0 ? (
        <div className="mt-12 border border-dashed border-bronze/60 bg-panel-deep/40 p-10 text-center">
          <div className="font-mono text-sm text-paper-muted">
            No changelog entries yet.
          </div>
          <div className="mt-2 font-mono text-xs text-wire">
            New parser, methodology, and product releases will appear here as
            they ship.
          </div>
        </div>
      ) : (
        <ol className="mt-12 space-y-12">
          {entries.map((e) => (
            <li key={e.id}>
              <div className="flex items-center gap-3">
                <span className="num-display text-3xl font-bold text-paper">
                  {e.version}
                </span>
                <span
                  className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                    TYPE_COLORS[e.type] ?? "text-paper border-bronze/60"
                  }`}
                >
                  {e.type}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-wire">
                  {formatReleaseDate(e.releasedOn)}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-paper-muted">
                {e.items.map((it) => (
                  <li
                    key={it}
                    className="border-l-2 border-bronze pl-4 text-sm"
                  >
                    {it}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
