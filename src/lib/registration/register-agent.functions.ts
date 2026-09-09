import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isAeonRegistrationType,
  upsertAeonIngestSubject,
} from "@/lib/registration/upsert-aeon-agent.server";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function nullable(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function requireBase58(value: string | null, label: string): string {
  if (!value || !BASE58.test(value)) throw new Error(`${label} must be a Solana address.`);
  return value;
}

export interface RegisterAgentInput {
  agent_name: string;
  agent_description: string | null;
  agent_type: string;
  category: string;
  ecosystem: string;
  website_url: string | null;
  contact: string | null;
  legal_owner_type: string;
  legal_owner_name: string | null;
  aeon_cri: string | null;
  aeon_executor_wallet: string | null;
  aeon_program_address: string | null;
  controller_wallet: string | null;
  operator_signer_wallet: string | null;
  spx402_wallet_address: string | null;
  income_wallet_address: string | null;
  treasury_wallet_address: string | null;
  recovery_admin_wallet: string | null;
  wallet_custody_type: string;
  route_all_income_to_treasury: boolean;
  routing_change_authority: string;
  visibility_status: string;
  publication_intent: string;
  subject_identifier: string | null;
  identifier_kind: string;
  disclosure_operates_agent: boolean | null;
  disclosure_financial_interest: boolean | null;
  disclosure_token_now_or_planned: boolean | null;
  disclosure_holds_or_trades_token: boolean | null;
  disclosure_issuer_operated_counterparty: boolean | null;
  disclosure_independent_counterparty: boolean | null;
  disclosure_issuer_operates_rails: boolean | null;
  disclosure_program_upgrade_authority: boolean | null;
  disclosure_upgrade_authority_controller: string | null;
}

export const submitAgentRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RegisterAgentInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const name = data.agent_name.trim();
    if (name.length < 2) throw new Error("Give the agent a name.");

    const aeon = isAeonRegistrationType(data.agent_type);
    const wallet = nullable(data.aeon_executor_wallet);
    const cri = nullable(data.aeon_cri);
    if (aeon) {
      requireBase58(wallet, "AEON executor wallet");
      requireBase58(cri, "AEON CRI");
      await upsertAeonIngestSubject(supabaseAdmin, {
        agentName: name,
        executorWallet: wallet as string,
        cri,
        programId: nullable(data.aeon_program_address),
      });
    }

    const { data: row, error } = await supabaseAdmin
      .from("agent_registrations")
      .insert({
        user_id: context.userId,
        agent_name: name,
        agent_description: nullable(data.agent_description),
        agent_type: data.agent_type,
        category: data.category,
        ecosystem: data.ecosystem,
        website_url: nullable(data.website_url),
        contact: nullable(data.contact),
        legal_owner_type: data.legal_owner_type,
        legal_owner_name: nullable(data.legal_owner_name),
        aeon_cri: cri,
        aeon_executor_wallet: wallet,
        aeon_program_address: nullable(data.aeon_program_address),
        controller_wallet: nullable(data.controller_wallet),
        operator_signer_wallet: nullable(data.operator_signer_wallet),
        spx402_wallet_address: nullable(data.spx402_wallet_address),
        income_wallet_address: nullable(data.income_wallet_address),
        treasury_wallet_address: nullable(data.treasury_wallet_address),
        recovery_admin_wallet: nullable(data.recovery_admin_wallet),
        wallet_custody_type: data.wallet_custody_type,
        route_all_income_to_treasury: data.route_all_income_to_treasury,
        routing_change_authority: data.routing_change_authority,
        visibility_status: data.visibility_status,
        publication_intent: data.publication_intent,
        registration_status: "submitted",
        publication_status: "unpublished",
        subject_identifier: nullable(data.subject_identifier) ?? wallet ?? cri,
        identifier_kind: data.identifier_kind,
        disclosure_operates_agent: data.disclosure_operates_agent,
        disclosure_financial_interest: data.disclosure_financial_interest,
        disclosure_token_now_or_planned: data.disclosure_token_now_or_planned,
        disclosure_holds_or_trades_token: data.disclosure_holds_or_trades_token,
        disclosure_issuer_operated_counterparty: data.disclosure_issuer_operated_counterparty,
        disclosure_independent_counterparty: data.disclosure_independent_counterparty,
        disclosure_issuer_operates_rails: data.disclosure_issuer_operates_rails,
        disclosure_program_upgrade_authority: data.disclosure_program_upgrade_authority,
        disclosure_upgrade_authority_controller: nullable(
          data.disclosure_upgrade_authority_controller,
        ),
      })
      .select("id")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Registration could not be saved.");
    return { id: row.id };
  });
