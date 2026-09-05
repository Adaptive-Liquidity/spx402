// Paid live badge — tier picker + on-chain attestation explainer.

import { useState } from "react";
import { BADGE_TIERS, HONEST_GRADE_RULE, type BadgeTier } from "@/lib/badge-plans";
import { formatUsdc } from "@/lib/plans";
import { BadgeSubscribeButton } from "@/components/spx/BadgeSubscribeButton";

export function BadgeSubscribe({ mint }: { mint?: string }) {
  const [tier, setTier] = useState<BadgeTier>("standard");
  const [subject, setSubject] = useState(mint ?? "");
  const ready = /^[a-zA-Z0-9]{8,64}$/.test(subject.trim());

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40">
        {(Object.values(BADGE_TIERS) as (typeof BADGE_TIERS)[BadgeTier][]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTier(t.id)}
            className={`bg-panel p-5 text-left ${tier === t.id ? "ring-1 ring-inset ring-amber" : ""}`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-xl font-semibold text-paper">{t.name}</span>
              <span className="font-mono text-[11px] text-amber">
                ${formatUsdc(t.priceUsdc)} / 30 days
              </span>
            </div>
            <ul className="mt-3 space-y-1">
              {t.features.map((f) => (
                <li key={f} className="font-mono text-[11px] text-paper-muted">
                  · {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="panel-engraved space-y-4 p-6">
        <div className="label-amber">Activate monitoring</div>
        {!mint && (
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
              Agent identifier
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mint, core asset, or executor wallet"
              className="mt-1 w-full border border-bronze/50 bg-panel-deep px-3 py-2 font-mono text-xs text-paper outline-none focus:border-amber"
            />
          </label>
        )}
        {ready ? (
          <BadgeSubscribeButton mint={subject.trim()} tier={tier} />
        ) : (
          <p className="font-mono text-[11px] text-paper-muted">
            Enter the agent identifier listed on its dossier to continue.
          </p>
        )}
        <p className="border-l-2 border-amber/60 bg-panel-deep/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-paper-muted">
          {HONEST_GRADE_RULE}
        </p>
      </div>
    </div>
  );
}
