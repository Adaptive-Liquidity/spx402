import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AgentRegistration = Tables<"agent_registrations">;

/** All registrations owned by the signed-in user. RLS scopes the read. */
export async function fetchMyRegistrations(): Promise<AgentRegistration[]> {
  const { data, error } = await supabase
    .from("agent_registrations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchRegistration(id: string): Promise<AgentRegistration | null> {
  const { data, error } = await supabase
    .from("agent_registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Setup checklist — pure presentation of stored values, no derived truth. */
export function setupChecklist(r: AgentRegistration) {
  return [
    { label: "Agent basics", done: !!r.agent_name },
    { label: "AEON identity submitted", done: !!r.aeon_cri || !!r.aeon_executor_wallet },
    { label: "SPX402 Wallet attached", done: !!r.spx402_wallet_address },
    { label: "Income routing declared", done: !!r.income_wallet_address },
    { label: "Treasury declared", done: !!r.treasury_wallet_address },
    { label: "Operator signer provided", done: !!r.operator_signer_wallet },
    {
      label: "Operator control proven",
      done: r.operator_verification_status === "verified",
    },
    { label: "Disclosures answered", done: r.disclosure_operates_agent !== null },
  ];
}
