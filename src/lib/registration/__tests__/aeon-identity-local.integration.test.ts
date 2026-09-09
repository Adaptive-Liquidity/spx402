import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { persistIssueAuthorityPdas } from "@/lib/indexer/aeon-pda.server";
import { upsertAeonIngestSubject } from "@/lib/registration/upsert-aeon-agent.server";
import type { AeonDecodedEvent } from "@/lib/indexer/decode-aeon.server";

const LOCAL_URL = process.env.SPX402_LOCAL_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SPX402_LOCAL_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.SPX402_LOCAL_ANON_KEY ?? "";

const enabled =
  process.env.SPX402_LOCAL_SUPABASE === "1" &&
  LOCAL_URL.includes("127.0.0.1") &&
  Boolean(SERVICE_KEY) &&
  Boolean(ANON_KEY);

const WALLET = "LocExec11111111111111111111111111111111111";
const CRI = "LocCri111111111111111111111111111111111111";
const IDENTITY = "LocId1111111111111111111111111111111111111";
const AUTHORITY = "LocAuth11111111111111111111111111111111111";
const BOND = "LocBond11111111111111111111111111111111111";

describe.skipIf(!enabled)("local AEON identity/publication DB", () => {
  const admin = createClient(LOCAL_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(LOCAL_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("can SELECT identity/publication columns and hide unpublished from anon", async () => {
    const { error: selectError } = await admin
      .from("agents")
      .select(
        "mint, aeon_agent_identity, aeon_authority_addresses, aeon_bond_addresses, aeon_program_id, publication_status",
      )
      .limit(1);
    expect(selectError).toBeNull();

    const inserted = await upsertAeonIngestSubject(admin, {
      agentName: "Local Identity Probe",
      executorWallet: WALLET,
      cri: CRI,
      programId: null,
    });
    expect(inserted.mode).toBe("insert");
    expect(inserted.mint).toBe(CRI);

    const { data: adminRow, error: adminReadError } = await admin
      .from("agents")
      .select(
        "mint, category, executor_wallet, aeon_cri_address, aeon_agent_identity, aeon_authority_addresses, aeon_bond_addresses, publication_status",
      )
      .eq("mint", CRI)
      .maybeSingle();
    expect(adminReadError).toBeNull();
    expect(adminRow?.publication_status).toBe("unpublished");
    expect(adminRow?.category).toBe("aeon_executor");
    expect(adminRow?.executor_wallet).toBe(WALLET);

    const { data: anonHidden, error: anonHiddenError } = await anon
      .from("agents")
      .select("mint")
      .eq("mint", CRI);
    expect(anonHiddenError).toBeNull();
    expect(anonHidden ?? []).toEqual([]);

    const { data: anonUnpublished, error: anonFilterError } = await anon
      .from("agents")
      .select("mint")
      .eq("publication_status", "unpublished");
    expect(anonFilterError).toBeNull();
    expect(anonUnpublished ?? []).toEqual([]);

    const merged = await upsertAeonIngestSubject(admin, {
      agentName: "Local Identity Probe",
      executorWallet: WALLET,
      cri: "LocOtherCri111111111111111111111111111111",
      programId: null,
    });
    expect(merged.mode).toBe("merge");
    expect(merged.mint).toBe(CRI);

    await persistIssueAuthorityPdas(admin, [
      {
        mint: CRI,
        type: "AEON_AUTHORITY_ISSUED",
        raw: {
          instruction: "issue_authority",
          authority: AUTHORITY,
          bond: BOND,
          agent_identity: IDENTITY,
        },
      } as unknown as AeonDecodedEvent,
    ]);

    const { data: pdas, error: pdaError } = await admin
      .from("agents")
      .select("aeon_agent_identity, aeon_authority_addresses, aeon_bond_addresses, publication_status")
      .eq("mint", CRI)
      .single();
    expect(pdaError).toBeNull();
    expect(pdas?.aeon_agent_identity).toBe(IDENTITY);
    expect(pdas?.aeon_authority_addresses).toEqual([AUTHORITY]);
    expect(pdas?.aeon_bond_addresses).toEqual([BOND]);
    expect(pdas?.publication_status).toBe("unpublished");

    const { data: stillHidden } = await anon.from("agents").select("mint").eq("mint", CRI);
    expect(stillHidden ?? []).toEqual([]);

    await admin.from("agents").delete().eq("mint", CRI);
  });
});
