/**
 * The single formatting layer for SPX402. Locked by SPX402_DESIGN_SYSTEM_LOCK.md
 * section 8 — no route or component implements its own version of these.
 *
 * Rule: missing values print an explicit absent marker ("NONE" / "—"), never 0 and
 * never a guess.
 */

export const NONE = "NONE";
export const DASH = "—";

type Nullish = null | undefined;

function isMissing(value: unknown): value is Nullish {
  return value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value));
}

function toDate(value: string | number | Date | Nullish): Date | null {
  if (isMissing(value)) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `YYYY-MM-DD HH:MM UTC` — always UTC, never the browser locale. */
export function formatUtc(value: string | number | Date | Nullish): string {
  const d = toDate(value);
  if (!d) return NONE;
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** `YYYY-MM-DD` — date only, UTC. */
export function formatUtcDate(value: string | number | Date | Nullish): string {
  const d = toDate(value);
  if (!d) return NONE;
  return d.toISOString().slice(0, 10);
}

/** `11d ago`, `4h ago`, `just now`. Returns NONE when the timestamp is absent. */
export function formatRelative(value: string | number | Date | Nullish, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return NONE;
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** first 4 + … + last 4 */
export function truncateAddress(address: string | Nullish, lead = 4, tail = 4): string {
  if (!address) return NONE;
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** first 6 + … + last 6 */
export function formatTxSignature(signature: string | Nullish): string {
  return truncateAddress(signature, 6, 6);
}

function trimZeros(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/** Up to 4 dp, trailing zeros trimmed, ` SOL` suffix. */
export function formatSol(value: number | Nullish, options: { suffix?: boolean } = {}): string {
  if (isMissing(value)) return NONE;
  const { suffix = true } = options;
  const abs = Math.abs(value);
  const body =
    abs >= 1000
      ? Math.round(value).toLocaleString("en-US")
      : trimZeros(value.toFixed(4));
  return suffix ? `${body} SOL` : body;
}

/** `$` + thousands separators; 2 dp under $1,000, whole dollars above. */
export function formatUsd(value: number | Nullish): string {
  if (isMissing(value)) return NONE;
  const fractionDigits = Math.abs(value) < 1000 ? 2 : 0;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/** Integer + ` bps`. */
export function formatBps(value: number | Nullish): string {
  if (isMissing(value)) return NONE;
  return `${Math.round(value).toLocaleString("en-US")} bps`;
}

/** Integer score, or an em dash when not yet graded. */
export function formatScore(value: number | Nullish): string {
  if (isMissing(value)) return DASH;
  return String(Math.round(value));
}

/**
 * 1 dp + `%`. Pass a 0..1 ratio with `{ ratio: true }`, otherwise a 0..100 value.
 */
export function formatPercent(
  value: number | Nullish,
  options: { ratio?: boolean; digits?: number } = {},
): string {
  if (isMissing(value)) return DASH;
  const { ratio = false, digits = 1 } = options;
  const pct = ratio ? value * 100 : value;
  return `${trimZeros(pct.toFixed(digits))}%`;
}

/** Thousands separators; renders 0 as "0" (counts are never missing when supplied). */
export function formatCount(value: number | Nullish): string {
  if (isMissing(value)) return DASH;
  return Math.round(value).toLocaleString("en-US");
}
