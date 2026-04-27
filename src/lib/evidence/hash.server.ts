// Wave 1c — canonical hashing helpers for the Evidence Bundle API.
//
// Server-only. Uses Web Crypto's `crypto.subtle` (available in the
// Cloudflare Worker runtime under nodejs_compat) so we don't need any
// external hash library.
//
// IMPORTANT: every hash that appears in a published evidence bundle or
// attestation must come through `canonicalJsonStringify` first. JSON.stringify
// with insertion-order keys is NOT stable across producers. Without
// canonicalization, an honest verifier could re-hash the same logical
// object and get a different digest, breaking proof.
//
// This implementation matches the JCS (RFC 8785) subset we need:
//   - object keys sorted lexicographically
//   - arrays preserve order
//   - numbers / strings / booleans / nulls serialized via JSON.stringify
//   - undefined values dropped (treated as missing keys)
//
// We deliberately do NOT support BigInt or Date — convert at the call-site.

export function canonicalJsonStringify(value: unknown): string {
  return stringify(value);
}

function stringify(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "null";
    return JSON.stringify(v);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    return `[${v.map(stringify).join(",")}]`;
  }
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${stringify(obj[k])}`);
    return `{${parts.join(",")}}`;
  }
  // Fallback (function, symbol, undefined) — drop.
  return "null";
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

// Build a Merkle root over an ordered list of leaf hex digests.
// - Duplicates the last node when the level has an odd count (Bitcoin-style).
// - Returns "" for an empty list.
// - Returns the single leaf for a one-leaf list.
//
// Leaves MUST already be hashed (typically sha256(canonical_json(event))).
// Order MUST be deterministic (we sort by occurred_at ASC, then event id).
export async function merkleRootHex(leavesHex: string[]): Promise<string> {
  if (leavesHex.length === 0) return "";
  let level = leavesHex.slice();
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(await sha256Hex(hexToBytes(left + right)));
    }
    level = next;
  }
  return level[0];
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}
