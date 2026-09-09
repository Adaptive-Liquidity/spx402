import type { SupabaseClient } from "@supabase/supabase-js";
import { PUBLICATION_UNPUBLISHED } from "@/lib/agents/publication";

export const AEON_REGISTRATION_TYPES = ["aeon", "aeon_spx402_wallet"] as const;

export function isAeonRegistrationType(agentType: string): boolean {
  return (AEON_REGISTRATION_TYPES as readonly string[]).includes(agentType);
}

export function resolveAeonIngestMint(opts: {
  cri: string | null;
  wallet: string;
  existingMintByWallet: string | null;
}): { mint: string; mode: "insert" | "merge" } {
  if (opts.existingMintByWallet) {
    return { mint: opts.existingMintByWallet, mode: "merge" };
  }
  return { mint: opts.cri || opts.wallet, mode: "insert" };
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
): Promise<{ mint: string; mode: "insert" | "merge" }> {
  const wallet = input.executorWallet;
  const { data: existing } = await admin
    .from("agents")
    .select("mint")
    .eq("executor_wallet", wallet)
    .maybeSingle();
  const resolved = resolveAeonIngestMint({
    cri: input.cri,
    wallet,
    existingMintByWallet: existing?.mint ?? null,
  });

  const aeonPatch = {
    category: "aeon_executor",
    identifier_kind: "executor_wallet" as const,
    executor_wallet: wallet,
    aeon_cri_address: input.cri,
    aeon_program_id: input.programId,
    publication_status: PUBLICATION_UNPUBLISHED,
  };

  if (resolved.mode === "merge") {
    const { error } = await admin.from("agents").update(aeonPatch).eq("mint", resolved.mint);
    if (error) throw new Error(`AEON ingest merge failed: ${error.message}`);
    return resolved;
  }

  const { error } = await admin.from("agents").insert({
    mint: resolved.mint,
    name: input.agentName,
    symbol: symbolFromName(input.agentName),
    grade: "SPX404",
    status: "active",
    operator_verified: false,
    aeon_authority_addresses: [],
    aeon_bond_addresses: [],
    ...aeonPatch,
  });
  if (error) throw new Error(`AEON ingest insert failed: ${error.message}`);
  return resolved;
}
