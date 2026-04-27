import { Link } from "@tanstack/react-router";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import type { Agent } from "@/lib/agents";
import { categoryMeta } from "@/lib/agents/categories";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export function AgentRow({ agent }: { agent: Agent }) {
  return (
    <Link
      to="/agent/$mint"
      params={{ mint: agent.mint }}
      className="panel-engraved group block transition-colors hover:bg-panel/60"
    >
      <div className="grid grid-cols-12 items-center gap-4 px-5 py-4">
        <div className="col-span-12 sm:col-span-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-bronze/60 bg-panel-deep font-mono text-xs font-bold text-amber">
              {agent.symbol.slice(0, 4)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-semibold text-paper">
                  ${agent.symbol}
                </span>
                {agent.operatorVerified ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-verified" aria-label="Operator verified" />
                ) : null}
              </div>
              <div className="truncate font-mono text-[11px] text-wire">
                {agent.name}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-6 sm:col-span-2">
          <div className="label-mono">Grade</div>
          <div className="mt-1.5">
            <ExecutionGradeBadge grade={agent.grade} size="sm" />
          </div>
        </div>

        <div className="col-span-6 sm:col-span-1">
          <div className="label-mono">Score</div>
          <div className="num-display mt-1.5 text-lg font-semibold text-paper">
            {agent.score ?? "—"}
          </div>
        </div>

        <div className="col-span-6 sm:col-span-2">
          <div className="label-mono">Buybacks</div>
          <div className="num-display mt-1.5 text-lg font-semibold text-paper">
            {agent.totalBuybacksCount.toLocaleString()}
          </div>
        </div>

        <div className="col-span-6 sm:col-span-2">
          <div className="label-mono">Last buyback</div>
          <div className="mt-1.5 font-mono text-xs text-paper-muted">
            {agent.lastBuybackLabel}
          </div>
        </div>

        <div className="col-span-12 hidden sm:col-span-1 sm:block">
          {agent.failedWindows > 10 ? (
            <AlertTriangle className="ml-auto h-4 w-4 text-critical" aria-label="Anomalies" />
          ) : (
            <span className="ml-auto block text-right font-mono text-xs text-amber group-hover:translate-x-1 transition-transform">
              →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
