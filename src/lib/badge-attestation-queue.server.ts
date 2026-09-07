import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ActivationQueueStore, PendingActivationRow } from "./badge-attestation-queue";

// Production Supabase adapter for the activation retry queue.
// Table postdates generated types (see migration); `as never` matches the
// codebase pattern until the next types regen. Remove the casts then.
export const supabaseActivationQueueStore: ActivationQueueStore = {
  async read(mint: string): Promise<PendingActivationRow | null> {
    const { data, error } = await supabaseAdmin
      .from("badge_attestation_queue" as never)
      .select("mint, kind, attempts, next_retry_at, last_error")
      .eq("mint", mint)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as unknown as PendingActivationRow;
    return {
      mint: r.mint,
      kind: r.kind,
      attempts: r.attempts ?? 0,
      next_retry_at: r.next_retry_at,
      last_error: r.last_error ?? null,
    };
  },

  async upsert(row: PendingActivationRow): Promise<void> {
    const { error } = await supabaseAdmin.from("badge_attestation_queue" as never).upsert(
      {
        mint: row.mint,
        kind: row.kind,
        attempts: row.attempts,
        next_retry_at: row.next_retry_at,
        last_error: row.last_error,
      } as never,
      { onConflict: "mint" },
    );
    if (error) throw new Error(`activation queue upsert failed: ${error.message}`);
  },

  async due(nowIso: string, limit: number): Promise<PendingActivationRow[]> {
    const { data, error } = await supabaseAdmin
      .from("badge_attestation_queue" as never)
      .select("mint, kind, attempts, next_retry_at, last_error")
      .lte("next_retry_at", nowIso)
      .order("next_retry_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`activation queue due-read failed: ${error.message}`);
    return ((data ?? []) as unknown as PendingActivationRow[]).map((r) => ({
      mint: r.mint,
      kind: r.kind,
      attempts: r.attempts ?? 0,
      next_retry_at: r.next_retry_at,
      last_error: r.last_error ?? null,
    }));
  },

  async remove(mint: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("badge_attestation_queue" as never)
      .delete()
      .eq("mint", mint);
    if (error) throw new Error(`activation queue remove failed: ${error.message}`);
  },
};
