import type { SupabaseClient } from "@supabase/supabase-js";
import { PUBLICATION_UNPUBLISHED } from "@/lib/agents/publication";

export const AEON_REGISTRATION_TYPES = ["aeon", "aeon_spx402_wallet"] as const;

export function isAeonRegistrationType(agentType: string): boolean {
  return (AEON_REGISTRATION_TYPES as readonly string[]).includes(agentType);
}

/** Surrogate PK for a new AEON row. Never reuse an existing agents.mint. */
export function resolveAeonIngestMint(opts: { cri: string | null; wallet: string }): string {
  return opts.cri || opts.wallet;
}

function symbolFromName(name: string): string {
  const compact = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (compact.slice(0, 8) || "AEON").padEnd(2, "X");
}

export interface AeonIngestInput {
  agentName: string;
  executorWallet: string;
  cri: string | null;
  programId: string | null;
}

export async function upsertAeonIngestSubject(
  admin: Pick<SupabaseClient, "from">,
  input: AeonIngestInput,
): Promise<{ mint: string; mode: "insert" }> {
  const wallet = input.executorWallet;
  const { data: existing, error: lookupError } = await admin
    .from("agents")
    .select("mint")
    .eq("executor_wallet", wallet)
    .maybeSingle();
  if (lookupError) throw new Error(`AEON ingest lookup failed: ${lookupError.message}`);
  if (existing?.mint) {
    throw new Error("This executor wallet is already registered.");
  }

  const mint = resolveAeonIngestMint({ cri: input.cri, wallet });
  const { error } = await admin.from("agents").insert({
    mint,
    name: input.agentName,
    symbol: symbolFromName(input.agentName),
    grade: "SPX404",
    status: "active",
    operator_verified: false,
    aeon_authority_addresses: [],
    aeon_bond_addresses: [],
    category: "aeon_executor",
    identifier_kind: "executor_wallet" as const,
    executor_wallet: wallet,
    aeon_cri_address: input.cri,
    aeon_program_id: input.programId,
    publication_status: PUBLICATION_UNPUBLISHED,
  });
  if (error) throw new Error(`AEON ingest insert failed: ${error.message}`);
  return { mint, mode: "insert" };
}
