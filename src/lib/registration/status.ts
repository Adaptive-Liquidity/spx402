// Single source of truth for the SPX402 public status vocabulary.
// Every truth-sensitive surface (wizard, dossier, registry, leaderboard,
// dashboard) renders these and only these. A status that the backend has not
// returned renders as `unknown`, never as a favourable default.

export type StatusTone = "neutral" | "pending" | "verified" | "warning" | "failure" | "unknown";

export type StatusKey =
  // visibility / publication
  | "draft"
  | "private"
  | "internal"
  | "public"
  | "archived"
  // trust lifecycle
  | "tracked"
  | "ungraded"
  | "waiting_for_evidence"
  | "waiting_for_observation_window"
  | "provisional"
  | "graded"
  // AEON identity
  | "aeon_pending"
  | "aeon_verified"
  | "aeon_failed"
  // SPX402 wallet
  | "wallet_missing"
  | "wallet_pending"
  | "wallet_connected"
  | "income_route_confirmed"
  | "income_route_missing"
  | "treasury_missing"
  // custody
  | "owner_controlled"
  | "multisig_controlled"
  | "custodial"
  // operator
  | "operator_verified"
  | "operator_unverified"
  | "signature_requested"
  | "signature_submitted"
  // disclosure
  | "issuer_interest"
  // attestation
  | "attestation_pending"
  | "attested"
  | "superseded"
  | "correction_published"
  // release
  | "mainnet_pending"
  | "devnet_live"
  | "mainnet_live"
  | "verification_failed"
  // fallback
  | "unknown";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** Short plain-language explanation shown on hover. */
  hint: string;
}

export const STATUS: Record<StatusKey, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral", hint: "Set-up has started but nothing is submitted." },
  private: {
    label: "Private",
    tone: "neutral",
    hint: "Visible only to the owner. Not in the registry, leaderboard, API or sitemap.",
  },
  internal: {
    label: "Internal",
    tone: "neutral",
    hint: "Visible to the owner and approved collaborators only.",
  },
  public: { label: "Public", tone: "verified", hint: "Published and publicly discoverable." },
  archived: { label: "Archived", tone: "neutral", hint: "Retired by the owner." },

  tracked: { label: "Tracked", tone: "pending", hint: "SPX402 is indexing this subject." },
  ungraded: {
    label: "Ungraded",
    tone: "pending",
    hint: "Tracked, but no grade has been earned yet.",
  },
  waiting_for_evidence: {
    label: "Waiting for Evidence",
    tone: "pending",
    hint: "Below the evidence floor. No grade is published until it is met.",
  },
  waiting_for_observation_window: {
    label: "Waiting for Observation Window",
    tone: "pending",
    hint: "Activity exists but the observation window has not elapsed.",
  },
  provisional: {
    label: "Provisional",
    tone: "warning",
    hint: "Scored below the evidence floor. Treat as indicative, not final.",
  },
  graded: {
    label: "Graded",
    tone: "verified",
    hint: "Meets the evidence floor and the published methodology.",
  },

  aeon_pending: { label: "AEON Pending", tone: "pending", hint: "AEON identity not yet verified." },
  aeon_verified: {
    label: "AEON Verified",
    tone: "verified",
    hint: "AEON identity confirmed on-chain.",
  },
  aeon_failed: {
    label: "AEON Failed",
    tone: "failure",
    hint: "AEON identity verification did not pass.",
  },

  wallet_missing: {
    label: "SPX402 Wallet Missing",
    tone: "neutral",
    hint: "No payment wallet is attached to this agent.",
  },
  wallet_pending: {
    label: "SPX402 Wallet Pending",
    tone: "pending",
    hint: "Wallet submitted, awaiting verification.",
  },
  wallet_connected: {
    label: "SPX402 Wallet Connected",
    tone: "verified",
    hint: "Payment wallet attached and verified.",
  },
  income_route_confirmed: {
    label: "Income Route Confirmed",
    tone: "verified",
    hint: "Income routes to an owner-approved wallet.",
  },
  income_route_missing: {
    label: "Income Route Missing",
    tone: "warning",
    hint: "No approved destination for agent income.",
  },
  treasury_missing: {
    label: "Treasury Missing",
    tone: "warning",
    hint: "No treasury wallet has been declared.",
  },

  owner_controlled: {
    label: "Owner Controlled",
    tone: "verified",
    hint: "Keys held by the declared operator.",
  },
  multisig_controlled: {
    label: "Multisig Controlled",
    tone: "verified",
    hint: "Keys held under a multisig.",
  },
  custodial: {
    label: "Custodial",
    tone: "warning",
    hint: "A third party holds the keys for this wallet.",
  },

  operator_verified: {
    label: "Operator Verified",
    tone: "verified",
    hint: "Control proven by wallet signature.",
  },
  operator_unverified: {
    label: "Operator Unverified",
    tone: "neutral",
    hint: "No signature has proven who controls this agent.",
  },
  signature_requested: {
    label: "Signature Requested",
    tone: "pending",
    hint: "A signing challenge has been issued.",
  },
  signature_submitted: {
    label: "Signature Submitted",
    tone: "pending",
    hint: "Signature received, verification in progress.",
  },

  issuer_interest: {
    label: "Issuer Interest",
    tone: "warning",
    hint: "A disclosed financial or operational relationship exists.",
  },

  attestation_pending: {
    label: "Attestation Pending",
    tone: "pending",
    hint: "No on-chain attestation published yet.",
  },
  attested: { label: "Attested", tone: "verified", hint: "An on-chain attestation exists." },
  superseded: {
    label: "Superseded",
    tone: "warning",
    hint: "Replaced by a newer attestation. Kept, never deleted.",
  },
  correction_published: {
    label: "Correction Published",
    tone: "warning",
    hint: "A public correction has been issued for this subject.",
  },

  mainnet_pending: {
    label: "Mainnet Pending",
    tone: "pending",
    hint: "Not yet confirmed live on mainnet.",
  },
  devnet_live: { label: "Devnet Live", tone: "pending", hint: "Running on devnet only." },
  mainnet_live: { label: "Mainnet Live", tone: "verified", hint: "Confirmed live on mainnet." },
  verification_failed: {
    label: "Verification Failed",
    tone: "failure",
    hint: "Verification did not pass.",
  },

  unknown: {
    label: "Not yet returned",
    tone: "unknown",
    hint: "The backend has not returned this value. Nothing is assumed.",
  },
};

export function statusMeta(key: string | null | undefined): StatusMeta {
  if (key && key in STATUS) return STATUS[key as StatusKey];
  return STATUS.unknown;
}

/** Map raw backend field values onto the public vocabulary. */
export function aeonStatusKey(v: string | null | undefined): StatusKey {
  switch (v) {
    case "verified":
      return "aeon_verified";
    case "pending":
      return "aeon_pending";
    case "failed":
      return "aeon_failed";
    case "not_connected":
      return "aeon_pending";
    default:
      return "unknown";
  }
}

export function walletStatusKey(v: string | null | undefined): StatusKey {
  switch (v) {
    case "connected":
      return "wallet_connected";
    case "pending":
      return "wallet_pending";
    case "missing":
      return "wallet_missing";
    case "failed":
      return "verification_failed";
    default:
      return "unknown";
  }
}

export function operatorStatusKey(v: string | null | undefined): StatusKey {
  switch (v) {
    case "verified":
      return "operator_verified";
    case "requested":
      return "signature_requested";
    case "submitted":
      return "signature_submitted";
    case "failed":
      return "verification_failed";
    case "unverified":
      return "operator_unverified";
    default:
      return "unknown";
  }
}

export function visibilityStatusKey(v: string | null | undefined): StatusKey {
  switch (v) {
    case "public":
      return "public";
    case "internal":
      return "internal";
    case "archived":
      return "archived";
    case "draft":
      return "draft";
    case "private":
      return "private";
    default:
      return "unknown";
  }
}

export function custodyStatusKey(v: string | null | undefined): StatusKey {
  switch (v) {
    case "operator_controlled":
      return "owner_controlled";
    case "company_controlled":
      return "owner_controlled";
    case "multisig":
      return "multisig_controlled";
    case "custodial":
      return "custodial";
    default:
      return "unknown";
  }
}

export function incomeRoutingStatusKey(v: string | null | undefined): StatusKey {
  switch (v) {
    case "confirmed":
      return "income_route_confirmed";
    case "missing":
      return "income_route_missing";
    default:
      return "unknown";
  }
}
