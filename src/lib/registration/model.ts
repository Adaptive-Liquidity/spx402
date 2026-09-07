// Registration wizard model: shapes, defaults and per-step validation.
// Truth-sensitive fields (verification, grade, attestation, release status)
// are NEVER set here — they come from the backend only.

import { z } from "zod";

export const AGENT_TYPES = [
  {
    id: "aeon",
    label: "AEON Agent",
    blurb: "On-chain identity and scoped authority, without a payment wallet yet.",
  },
  {
    id: "spx402_wallet",
    label: "SPX402 Wallet Agent",
    blurb: "A payment and income wallet for an agent that already has an identity elsewhere.",
  },
  {
    id: "aeon_spx402_wallet",
    label: "AEON + SPX402 Wallet Agent",
    blurb:
      "Create a real agent identity, add a payment wallet, prove control, and build reputation from verified evidence.",
  },
  { id: "tokenized", label: "Tokenized Agent", blurb: "An agent with a token and on-chain flows." },
  {
    id: "existing_solana",
    label: "Existing Solana Agent",
    blurb: "An agent already operating on Solana that you want indexed.",
  },
  {
    id: "outcome_receipt",
    label: "Outcome / Receipt Agent",
    blurb: "An agent that produces outcome receipts from priced work.",
  },
] as const;

export type AgentTypeId = (typeof AGENT_TYPES)[number]["id"];

export const OWNER_TYPES = ["individual", "company", "foundation", "other", "unknown"] as const;
export const CUSTODY_TYPES = [
  "operator_controlled",
  "company_controlled",
  "multisig",
  "custodial",
  "unknown",
] as const;
export const VISIBILITY_OPTIONS = ["private", "internal", "public"] as const;
export const PUBLICATION_INTENTS = [
  "keep_private",
  "publish_after_verification",
  "publish_manually",
] as const;

const base58 = z
  .string()
  .trim()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Must be a base58 Solana address (32–44 characters).");
const optionalBase58 = z.union([base58, z.literal("")]).optional();

export const stepSchemas = {
  type: z.object({ agent_type: z.enum(AGENT_TYPES.map((t) => t.id) as [string, ...string[]]) }),
  basics: z.object({
    agent_name: z.string().trim().min(2, "Give the agent a name.").max(80),
    agent_description: z.string().trim().max(500).optional(),
    category: z.string().min(1),
    ecosystem: z.string().min(1),
    website_url: z.union([z.string().url("Enter a full URL."), z.literal("")]).optional(),
    contact: z.string().trim().max(200).optional(),
  }),
  aeon: z.object({
    aeon_cri: optionalBase58,
    aeon_executor_wallet: optionalBase58,
    controller_wallet: optionalBase58,
    aeon_program_address: optionalBase58,
  }),
  wallet: z.object({
    spx402_wallet_address: optionalBase58,
  }),
  ownership: z.object({
    legal_owner_type: z.enum(OWNER_TYPES),
    legal_owner_name: z.string().trim().max(160).optional(),
    income_wallet_address: optionalBase58,
    treasury_wallet_address: optionalBase58,
    recovery_admin_wallet: optionalBase58,
    wallet_custody_type: z.enum(CUSTODY_TYPES),
    route_all_income_to_treasury: z.boolean(),
    routing_change_authority: z.string().min(1),
  }),
  operator: z.object({ operator_signer_wallet: optionalBase58 }),
  privacy: z.object({
    visibility_status: z.enum(VISIBILITY_OPTIONS),
    publication_intent: z.enum(PUBLICATION_INTENTS),
  }),
  disclosures: z.object({
    disclosure_operates_agent: z.boolean().nullable(),
    disclosure_financial_interest: z.boolean().nullable(),
    disclosure_token_now_or_planned: z.boolean().nullable(),
    disclosure_holds_or_trades_token: z.boolean().nullable(),
    disclosure_issuer_operated_counterparty: z.boolean().nullable(),
    disclosure_independent_counterparty: z.boolean().nullable(),
    disclosure_issuer_operates_rails: z.boolean().nullable(),
    disclosure_program_upgrade_authority: z.boolean().nullable(),
    disclosure_upgrade_authority_controller: z.string().trim().max(200).optional(),
  }),
};

export interface RegistrationDraft {
  agent_type: AgentTypeId;
  agent_name: string;
  agent_description: string;
  category: string;
  ecosystem: string;
  website_url: string;
  contact: string;

  aeon_cri: string;
  aeon_executor_wallet: string;
  controller_wallet: string;
  aeon_program_address: string;

  spx402_wallet_address: string;

  legal_owner_type: (typeof OWNER_TYPES)[number];
  legal_owner_name: string;
  income_wallet_address: string;
  treasury_wallet_address: string;
  recovery_admin_wallet: string;
  wallet_custody_type: (typeof CUSTODY_TYPES)[number];
  route_all_income_to_treasury: boolean;
  routing_change_authority: string;

  operator_signer_wallet: string;

  visibility_status: (typeof VISIBILITY_OPTIONS)[number];
  publication_intent: (typeof PUBLICATION_INTENTS)[number];

  disclosure_operates_agent: boolean | null;
  disclosure_financial_interest: boolean | null;
  disclosure_token_now_or_planned: boolean | null;
  disclosure_holds_or_trades_token: boolean | null;
  disclosure_issuer_operated_counterparty: boolean | null;
  disclosure_independent_counterparty: boolean | null;
  disclosure_issuer_operates_rails: boolean | null;
  disclosure_program_upgrade_authority: boolean | null;
  disclosure_upgrade_authority_controller: string;

  subject_identifier: string;
  identifier_kind: string;
}

export const emptyDraft: RegistrationDraft = {
  agent_type: "aeon_spx402_wallet",
  agent_name: "",
  agent_description: "",
  category: "general",
  ecosystem: "solana",
  website_url: "",
  contact: "",

  aeon_cri: "",
  aeon_executor_wallet: "",
  controller_wallet: "",
  aeon_program_address: "",

  spx402_wallet_address: "",

  legal_owner_type: "individual",
  legal_owner_name: "",
  income_wallet_address: "",
  treasury_wallet_address: "",
  recovery_admin_wallet: "",
  wallet_custody_type: "operator_controlled",
  route_all_income_to_treasury: true,
  routing_change_authority: "owner_only",

  operator_signer_wallet: "",

  visibility_status: "private",
  publication_intent: "keep_private",

  disclosure_operates_agent: null,
  disclosure_financial_interest: null,
  disclosure_token_now_or_planned: null,
  disclosure_holds_or_trades_token: null,
  disclosure_issuer_operated_counterparty: null,
  disclosure_independent_counterparty: null,
  disclosure_issuer_operates_rails: null,
  disclosure_program_upgrade_authority: null,
  disclosure_upgrade_authority_controller: "",

  subject_identifier: "",
  identifier_kind: "executor_wallet",
};

export const WIZARD_STEPS = [
  { id: "type", title: "Agent type" },
  { id: "basics", title: "Agent basics" },
  { id: "aeon", title: "AEON identity" },
  { id: "wallet", title: "SPX402 Wallet" },
  { id: "ownership", title: "Ownership & income routing" },
  { id: "operator", title: "Operator verification" },
  { id: "privacy", title: "Privacy & publication" },
  { id: "disclosures", title: "Disclosures" },
  { id: "evidence", title: "Evidence & status" },
  { id: "review", title: "Review & submit" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export const DISCLOSURE_QUESTIONS: {
  key: keyof RegistrationDraft;
  question: string;
}[] = [
  { key: "disclosure_operates_agent", question: "Do you operate this agent?" },
  { key: "disclosure_financial_interest", question: "Do you have financial interest in it?" },
  {
    key: "disclosure_token_now_or_planned",
    question: "Does this agent have or plan to have a token?",
  },
  {
    key: "disclosure_holds_or_trades_token",
    question: "Do you hold or trade any token connected to this subject?",
  },
  {
    key: "disclosure_issuer_operated_counterparty",
    question: "Is any counterparty issuer-operated?",
  },
  { key: "disclosure_independent_counterparty", question: "Is any counterparty independent?" },
  {
    key: "disclosure_issuer_operates_rails",
    question: "Does the issuer operate the rails or program this subject uses?",
  },
  {
    key: "disclosure_program_upgrade_authority",
    question: "Does that program have upgrade authority?",
  },
];
