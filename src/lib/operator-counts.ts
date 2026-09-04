import { useEffect, useState } from "react";
import { fetchWatchlist } from "@/lib/watchlist";
import { fetchSubscriptions } from "@/lib/alerts";
import { fetchApiKeys } from "@/lib/api-keys";

export interface OperatorCounts {
  watched: number;
  alertsArmed: number;
  alertsMuted: number;
  keysActive: number;
  keysTotal: number;
}

const ZERO: OperatorCounts = {
  watched: 0,
  alertsArmed: 0,
  alertsMuted: 0,
  keysActive: 0,
  keysTotal: 0,
};

interface CacheEntry {
  at: number;
  value: OperatorCounts;
}

const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();
const STALE_MS = 30_000;

function emit() {
  for (const l of listeners) l();
}

async function load(userId: string): Promise<OperatorCounts> {
  const [w, s, k] = await Promise.all([
    fetchWatchlist(userId),
    fetchSubscriptions(userId),
    fetchApiKeys(userId),
  ]);
  return {
    watched: w.length,
    alertsArmed: s.filter((x) => !x.paused).length,
    alertsMuted: s.filter((x) => x.paused).length,
    keysActive: k.filter((x) => x.status === "active").length,
    keysTotal: k.length,
  };
}

/**
 * Shared counts for the operator shell and the overview tiles. Cached briefly so
 * moving between tabs does not refire three queries per render.
 */
export function useOperatorCounts(userId: string | undefined) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    const entry = cache.get(userId);
    if (!entry || Date.now() - entry.at > STALE_MS) {
      void load(userId)
        .then((value) => {
          cache.set(userId, { at: Date.now(), value });
          emit();
        })
        .catch(() => {
          cache.set(userId, { at: Date.now(), value: ZERO });
          emit();
        });
    }
    return () => {
      listeners.delete(listener);
    };
  }, [userId]);

  if (!userId) return null;
  return cache.get(userId)?.value ?? null;
}

/** Drop the cache so the next read refetches (after add/remove actions). */
export function invalidateOperatorCounts(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
  emit();
}
