import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/agents/categories";
import {
  AGENT_TYPES,
  CUSTODY_TYPES,
  DISCLOSURE_QUESTIONS,
  OWNER_TYPES,
  PUBLICATION_INTENTS,
  VISIBILITY_OPTIONS,
  WIZARD_STEPS,
  emptyDraft,
  stepSchemas,
  type RegistrationDraft,
} from "@/lib/registration/model";
import { StatusChip } from "@/components/spx/StatusChip";
import { Field, OptionCard, PendingIntegration, YesNo, inputClass } from "./WizardPrimitives";
import { submitAgentRegistration } from "@/lib/registration/register-agent.functions";
import { cn } from "@/lib/utils";

const OWNER_TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  company: "Company",
  foundation: "Foundation",
  other: "Other",
  unknown: "Unknown",
};

const CUSTODY_LABEL: Record<string, string> = {
  operator_controlled: "Operator-controlled",
  company_controlled: "Company-controlled",
  multisig: "Multisig",
  custodial: "Custodial",
  unknown: "Unknown",
};

const VISIBILITY_LABEL: Record<string, string> = {
  private: "Private — owner only",
  internal: "Internal — owner and collaborators",
  public: "Public — listed in the registry",
};

const PUBLICATION_LABEL: Record<string, string> = {
  keep_private: "Keep private after registration",
  publish_after_verification: "Publish after verification",
  publish_manually: "Publish manually later",
};

export function AgentRegistrationWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RegistrationDraft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const current = WIZARD_STEPS[step];

  function validateCurrent(): boolean {
    const schema = (stepSchemas as Record<string, { safeParse: (v: unknown) => unknown }>)[
      current.id
    ];
    if (!schema) return true;
    const result = (
      schema as {
        safeParse: (v: unknown) => {
          success: boolean;
          error?: { issues: { path: (string | number)[]; message: string }[] };
        };
      }
    ).safeParse(draft);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error?.issues ?? []) next[String(issue.path[0])] = issue.message;
    setErrors(next);
    return false;
  }

  function goNext() {
    if (!validateCurrent()) return;
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  async function submit() {
    if (!user) {
      setSubmitError("Sign in to register an agent.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const nullable = (v: string) => (v.trim() === "" ? null : v.trim());
    try {
      const data = await submitAgentRegistration({
        data: {
          agent_name: draft.agent_name.trim(),
          agent_description: nullable(draft.agent_description),
          agent_type: draft.agent_type,
          category: draft.category,
          ecosystem: draft.ecosystem,
          website_url: nullable(draft.website_url),
          contact: nullable(draft.contact),
          legal_owner_type: draft.legal_owner_type,
          legal_owner_name: nullable(draft.legal_owner_name),
          aeon_cri: nullable(draft.aeon_cri),
          aeon_executor_wallet: nullable(draft.aeon_executor_wallet),
          aeon_program_address: nullable(draft.aeon_program_address),
          controller_wallet: nullable(draft.controller_wallet),
          operator_signer_wallet: nullable(draft.operator_signer_wallet),
          spx402_wallet_address: nullable(draft.spx402_wallet_address),
          income_wallet_address: nullable(draft.income_wallet_address),
          treasury_wallet_address: nullable(draft.treasury_wallet_address),
          recovery_admin_wallet: nullable(draft.recovery_admin_wallet),
          wallet_custody_type: draft.wallet_custody_type,
          route_all_income_to_treasury: draft.route_all_income_to_treasury,
          routing_change_authority: draft.routing_change_authority,
          visibility_status: draft.visibility_status,
          publication_intent: draft.publication_intent,
          subject_identifier: nullable(draft.aeon_executor_wallet || draft.spx402_wallet_address),
          identifier_kind: draft.identifier_kind,
          disclosure_operates_agent: draft.disclosure_operates_agent,
          disclosure_financial_interest: draft.disclosure_financial_interest,
          disclosure_token_now_or_planned: draft.disclosure_token_now_or_planned,
          disclosure_holds_or_trades_token: draft.disclosure_holds_or_trades_token,
          disclosure_issuer_operated_counterparty: draft.disclosure_issuer_operated_counterparty,
          disclosure_independent_counterparty: draft.disclosure_independent_counterparty,
          disclosure_issuer_operates_rails: draft.disclosure_issuer_operates_rails,
          disclosure_program_upgrade_authority: draft.disclosure_program_upgrade_authority,
          disclosure_upgrade_authority_controller: nullable(
            draft.disclosure_upgrade_authority_controller,
          ),
        },
      });
      setSubmitting(false);
      navigate({ to: "/dashboard/agents/$id", params: { id: data.id } });
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : "Registration could not be saved.");
    }
  }

  return (
    <div>
      {/* progress rail */}
      <ol className="mt-8 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2 lg:grid-cols-5">
        {WIZARD_STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "w-full bg-panel px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest transition-colors",
                i === step ? "text-amber" : i < step ? "text-paper-muted" : "text-wire",
              )}
            >
              <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> · {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="panel-engraved mt-6 p-6">
        <div className="label-amber">
          Step {step + 1} of {WIZARD_STEPS.length}
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper">{current.title}</h2>

        {current.id === "type" && (
          <div className="mt-5 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
            {AGENT_TYPES.map((t) => (
              <OptionCard
                key={t.id}
                active={draft.agent_type === t.id}
                title={t.label}
                blurb={t.blurb}
                recommended={t.id === "aeon_spx402_wallet"}
                onClick={() => set("agent_type", t.id)}
              />
            ))}
          </div>
        )}

        {current.id === "basics" && (
          <div className="mt-5 space-y-5">
            <Field label="Agent name" error={errors.agent_name}>
              <input
                className={inputClass}
                value={draft.agent_name}
                onChange={(e) => set("agent_name", e.target.value)}
              />
            </Field>
            <Field label="Short description">
              <textarea
                rows={3}
                className={inputClass}
                value={draft.agent_description}
                onChange={(e) => set("agent_description", e.target.value)}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category">
                <select
                  className={inputClass}
                  value={draft.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.longLabel}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ecosystem / network">
                <select
                  className={inputClass}
                  value={draft.ecosystem}
                  onChange={(e) => set("ecosystem", e.target.value)}
                >
                  <option value="solana">Solana</option>
                  <option value="base">Base</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Website or profile (optional)" error={errors.website_url}>
                <input
                  className={inputClass}
                  value={draft.website_url}
                  onChange={(e) => set("website_url", e.target.value)}
                  placeholder="https://"
                />
              </Field>
              <Field label="Public contact (optional)">
                <input
                  className={inputClass}
                  value={draft.contact}
                  onChange={(e) => set("contact", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {current.id === "aeon" && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-paper-muted">
              AEON gives your agent a durable identity and controlled economic authority. SPX402
              uses it to verify who the agent is and what it has done.
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusChip status="aeon_pending" />
              <StatusChip status="mainnet_pending" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="AEON CRI / identity address" error={errors.aeon_cri}>
                <input
                  className={inputClass}
                  value={draft.aeon_cri}
                  onChange={(e) => set("aeon_cri", e.target.value)}
                />
              </Field>
              <Field label="AEON executor wallet" error={errors.aeon_executor_wallet}>
                <input
                  className={inputClass}
                  value={draft.aeon_executor_wallet}
                  onChange={(e) => set("aeon_executor_wallet", e.target.value)}
                />
              </Field>
              <Field label="Controller / authority wallet" error={errors.controller_wallet}>
                <input
                  className={inputClass}
                  value={draft.controller_wallet}
                  onChange={(e) => set("controller_wallet", e.target.value)}
                />
              </Field>
              <Field label="AEON program address (optional)" error={errors.aeon_program_address}>
                <input
                  className={inputClass}
                  value={draft.aeon_program_address}
                  onChange={(e) => set("aeon_program_address", e.target.value)}
                />
              </Field>
            </div>
            <PendingIntegration endpoint="POST /api/registration/aeon-identity" />
          </div>
        )}

        {current.id === "wallet" && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-paper-muted">
              The SPX402 Wallet is your agent&apos;s payment and income wallet. It lets the agent
              pay, receive income, and build economic reputation.
            </p>
            <p className="font-mono text-[11px] text-amber">
              Creating a wallet does not create a grade. Reputation comes only from verified
              evidence.
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusChip status="wallet_missing" />
              <StatusChip status="income_route_missing" />
            </div>
            <Field
              label="Connect an existing SPX402 Wallet"
              hint="Paste the wallet the agent already uses for machine payments."
              error={errors.spx402_wallet_address}
            >
              <input
                className={inputClass}
                value={draft.spx402_wallet_address}
                onChange={(e) => set("spx402_wallet_address", e.target.value)}
              />
            </Field>
            <PendingIntegration endpoint="POST /api/registration/wallet" />
          </div>
        )}

        {current.id === "ownership" && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-paper-muted">
              This protects ownership and revenue. Agent income should route only to approved
              owner-controlled wallets.
            </p>
            <div className="border-l-2 border-amber/70 bg-amber/5 px-3 py-2.5 font-mono text-[11px] text-amber">
              SPX402 never silently custodies funds and never creates wallets whose keys the
              operator does not control.
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Legal owner type">
                <select
                  className={inputClass}
                  value={draft.legal_owner_type}
                  onChange={(e) =>
                    set("legal_owner_type", e.target.value as RegistrationDraft["legal_owner_type"])
                  }
                >
                  {OWNER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {OWNER_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Owner name">
                <input
                  className={inputClass}
                  value={draft.legal_owner_name}
                  onChange={(e) => set("legal_owner_name", e.target.value)}
                />
              </Field>
              <Field label="SPX402 income wallet" error={errors.income_wallet_address}>
                <input
                  className={inputClass}
                  value={draft.income_wallet_address}
                  onChange={(e) => set("income_wallet_address", e.target.value)}
                />
              </Field>
              <Field label="Treasury wallet" error={errors.treasury_wallet_address}>
                <input
                  className={inputClass}
                  value={draft.treasury_wallet_address}
                  onChange={(e) => set("treasury_wallet_address", e.target.value)}
                />
              </Field>
              <Field label="Recovery / admin wallet (optional)" error={errors.recovery_admin_wallet}>
                <input
                  className={inputClass}
                  value={draft.recovery_admin_wallet}
                  onChange={(e) => set("recovery_admin_wallet", e.target.value)}
                />
              </Field>
              <Field label="Wallet custody type">
                <select
                  className={inputClass}
                  value={draft.wallet_custody_type}
                  onChange={(e) =>
                    set(
                      "wallet_custody_type",
                      e.target.value as RegistrationDraft["wallet_custody_type"],
                    )
                  }
                >
                  {CUSTODY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CUSTODY_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Route all income to treasury?">
                <select
                  className={inputClass}
                  value={draft.route_all_income_to_treasury ? "yes" : "no"}
                  onChange={(e) => set("route_all_income_to_treasury", e.target.value === "yes")}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
              <Field label="Who can change wallet routing?">
                <select
                  className={inputClass}
                  value={draft.routing_change_authority}
                  onChange={(e) => set("routing_change_authority", e.target.value)}
                >
                  <option value="owner_only">Owner only</option>
                  <option value="owner_or_admin">Owner or admin</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {current.id === "operator" && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-paper-muted">
              This proves the submitted operator wallet controls the agent. Verified status is
              earned by signature, not manually assigned.
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusChip status="operator_unverified" />
            </div>
            <Field label="Operator signer wallet" error={errors.operator_signer_wallet}>
              <input
                className={inputClass}
                value={draft.operator_signer_wallet}
                onChange={(e) => set("operator_signer_wallet", e.target.value)}
              />
            </Field>
            <PendingIntegration endpoint="POST /api/registration/operator-challenge" />
          </div>
        )}

        {current.id === "privacy" && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-paper-muted">
              Registration does not automatically publish an agent. Private agents can be
              configured, verified and tested before appearing in the registry, leaderboard, API,
              evidence bundles or Genesis Record.
            </p>
            <Field label="Visibility">
              <select
                className={inputClass}
                value={draft.visibility_status}
                onChange={(e) =>
                  set("visibility_status", e.target.value as RegistrationDraft["visibility_status"])
                }
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {VISIBILITY_LABEL[v]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Publication">
              <select
                className={inputClass}
                value={draft.publication_intent}
                onChange={(e) =>
                  set(
                    "publication_intent",
                    e.target.value as RegistrationDraft["publication_intent"],
                  )
                }
              >
                {PUBLICATION_INTENTS.map((v) => (
                  <option key={v} value={v}>
                    {PUBLICATION_LABEL[v]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex flex-wrap gap-2">
              <StatusChip status={draft.visibility_status} />
            </div>
          </div>
        )}

        {current.id === "disclosures" && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-paper-muted">
              Disclosures do not block registration. They make reputation honest.
            </p>
            <div className="space-y-4">
              {DISCLOSURE_QUESTIONS.map((q) => (
                <div
                  key={String(q.key)}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-bronze/30 pb-3"
                >
                  <span className="text-sm text-paper">{q.question}</span>
                  <YesNo
                    value={draft[q.key] as boolean | null}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, [q.key]: v }) as unknown as RegistrationDraft)
                    }
                  />
                </div>
              ))}
            </div>
            <Field label="Who controls upgrade authority?">
              <input
                className={inputClass}
                value={draft.disclosure_upgrade_authority_controller}
                onChange={(e) => set("disclosure_upgrade_authority_controller", e.target.value)}
              />
            </Field>
          </div>
        )}

        {current.id === "evidence" && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-paper-muted">
              Everything below is backend-driven. Nothing on this screen is estimated, simulated or
              assumed by the site.
            </p>
            <dl className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
              {[
                "Decoded event count",
                "Event classes",
                "Observation window",
                "Evidence floor status",
                "Last indexed transaction",
                "Evidence bundle",
                "Grade",
                "Score",
                "Attestation",
              ].map((label) => (
                <div key={label} className="bg-panel px-4 py-3">
                  <dt className="label-mono">{label}</dt>
                  <dd className="mt-1">
                    <StatusChip status="unknown" />
                  </dd>
                </div>
              ))}
            </dl>
            <PendingIntegration endpoint="GET /api/registration/status/:subject" />
          </div>
        )}

        {current.id === "review" && (
          <div className="mt-5 space-y-5">
            <dl className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
              {[
                ["Agent name", draft.agent_name || "—"],
                ["Agent type", AGENT_TYPES.find((t) => t.id === draft.agent_type)?.label ?? "—"],
                ["AEON identity", draft.aeon_cri || "Not provided"],
                ["SPX402 Wallet", draft.spx402_wallet_address || "Not provided"],
                ["Income wallet", draft.income_wallet_address || "Not provided"],
                ["Treasury wallet", draft.treasury_wallet_address || "Not provided"],
                ["Legal owner", draft.legal_owner_name || OWNER_TYPE_LABEL[draft.legal_owner_type]],
                ["Operator signer", draft.operator_signer_wallet || "Not provided"],
                ["Visibility", VISIBILITY_LABEL[draft.visibility_status]],
                ["Publication", PUBLICATION_LABEL[draft.publication_intent]],
              ].map(([label, value]) => (
                <div key={label} className="bg-panel px-4 py-3">
                  <dt className="label-mono">{label}</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-paper">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="label-mono">Expected status after submit</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusChip status={draft.visibility_status} />
                <StatusChip status="tracked" />
                <StatusChip status="ungraded" />
                <StatusChip status="operator_unverified" />
              </div>
            </div>
            {!user && (
              <div className="border border-amber/60 bg-amber/10 p-4 font-mono text-sm text-amber">
                Sign in to submit.{" "}
                <Link to="/login" className="underline">
                  Log in
                </Link>
              </div>
            )}
            {submitError && (
              <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
                {submitError}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="focus-ring border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber disabled:opacity-40"
          >
            Back
          </button>
          {current.id === "review" ? (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !user}
              className="focus-ring border border-amber/80 bg-amber/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit registration"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="focus-ring border border-amber/80 bg-amber/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
