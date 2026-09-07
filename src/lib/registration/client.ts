// The single declared contract between the SPX402 frontend and the backend.
//
// Every endpoint the registration + reputation surfaces need is declared here,
// in one place, for the backend team. Endpoints that are not live yet return
// `{ available: false }` and the UI renders an explicit pending-integration
// state. The frontend never fabricates a wallet, verification, grade,
// attestation or release status.

export interface Pending {
  available: false;
  /** Machine-readable reason so the UI can explain the gap honestly. */
  reason: "endpoint_not_live";
  endpoint: string;
}

export type Result<T> = ({ available: true } & T) | Pending;

const pending = (endpoint: string): Pending => ({
  available: false,
  reason: "endpoint_not_live",
  endpoint,
});

/** Backend fields the reputation surfaces read. Nothing here is derived client-side. */
export interface SubjectStatus {
  agent_id: string | null;
  registration_status: string | null;
  visibility_status: string | null;
  publication_status: string | null;
  aeon_identity_status: string | null;
  spx402_wallet_status: string | null;
  income_routing_status: string | null;
  operator_verification_status: string | null;
  binding_status: string | null;
  decoded_event_count: number | null;
  event_classes: string[] | null;
  observation_window: string | null;
  evidence_floor_status: string | null;
  provisional: boolean | null;
  trust_status: string | null;
  grade: string | null;
  score: number | null;
  scoring_version: string | null;
  decoder_version: string | null;
  evidence_floor_version: string | null;
  methodology_version: string | null;
  issuer_interest: boolean | null;
  counterparty_labels: string[] | null;
  evidence_bundle_uri: string | null;
  evidence_bundle_hash: string | null;
  attestation_status: string | null;
  attestation_uid: string | null;
  superseded_attestation_uid: string | null;
  correction_history: unknown[] | null;
  aeon_release_status: string | null;
  mainnet_status: string | null;
  last_indexed_transaction: string | null;
  updated_at: string | null;
}

/* ------------------------------------------------------------------ */
/* Endpoints expected from the backend                                  */
/* ------------------------------------------------------------------ */

/** POST /api/registration/wallet — mint a new SPX402 Wallet for an agent. */
export async function createSpx402Wallet(): Promise<Result<{ address: string }>> {
  return pending("POST /api/registration/wallet");
}

/** GET /api/registration/wallet/:address — read wallet + income route state. */
export async function readSpx402Wallet(): Promise<
  Result<{ status: string; income_routing_status: string }>
> {
  return pending("GET /api/registration/wallet/:address");
}

/** POST /api/registration/aeon-identity — submit an AEON identity for verification. */
export async function submitAeonIdentity(): Promise<Result<{ status: string }>> {
  return pending("POST /api/registration/aeon-identity");
}

/** POST /api/registration/operator-challenge — issue a signing challenge. */
export async function requestOperatorChallenge(): Promise<Result<{ nonce: string }>> {
  return pending("POST /api/registration/operator-challenge");
}

/** POST /api/registration/operator-verify — verify the returned signature. */
export async function verifyOperatorSignature(): Promise<Result<{ status: string }>> {
  return pending("POST /api/registration/operator-verify");
}

/** GET /api/registration/status/:subject — full backend status for a subject. */
export async function readSubjectStatus(): Promise<Result<{ status: SubjectStatus }>> {
  return pending("GET /api/registration/status/:subject");
}

/** GET /api/genesis-record — the signed launch record. */
export async function readGenesisRecord(): Promise<
  Result<{ signature: string; public_key: string; attester_key: string; claim: string }>
> {
  return pending("GET /api/genesis-record");
}

/** GET /api/corrections — the public correction log. */
export async function readCorrections(): Promise<Result<{ corrections: unknown[] }>> {
  return pending("GET /api/corrections");
}

/** GET /api/aeon/release-status — devnet / mainnet-pending / mainnet-live. */
export async function readAeonReleaseStatus(): Promise<
  Result<{ release_status: string; mainnet_status: string; program_address: string }>
> {
  return pending("GET /api/aeon/release-status");
}

/** Human-readable list used by the developer docs page. */
export const EXPECTED_ENDPOINTS = [
  ["POST", "/api/registration/wallet", "Create an SPX402 Wallet for an agent"],
  ["GET", "/api/registration/wallet/:address", "Read wallet + income routing state"],
  ["POST", "/api/registration/aeon-identity", "Submit AEON identity for verification"],
  ["POST", "/api/registration/operator-challenge", "Issue an operator signing challenge"],
  ["POST", "/api/registration/operator-verify", "Verify an operator signature"],
  ["GET", "/api/registration/status/:subject", "Read registration + evidence status"],
  ["GET", "/api/genesis-record", "Read the signed Genesis Record"],
  ["GET", "/api/corrections", "Read the public correction log"],
  ["GET", "/api/aeon/release-status", "Read AEON devnet / mainnet release status"],
] as const;
