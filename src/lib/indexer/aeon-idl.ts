// Load the vendored AEON IDL and derive instruction discriminators from it.
// Discriminators are never invented here — they come from client/idl/aeon.json
// in Adaptive-Liquidity/aeon-program (copied by scripts/vendor-aeon-idl.py).

import bs58 from "bs58";
import idlJson from "./idl/aeon.json";

export const AEON_IDL_ADDRESS = idlJson.address as string;

export interface AeonIdlArg {
  name: string;
  type: unknown;
}

export interface AeonIdlAccountMeta {
  name: string;
  optional?: boolean;
}

export interface AeonIdlInstruction {
  name: string;
  discriminator: number[];
  args: AeonIdlArg[];
  accounts?: AeonIdlAccountMeta[];
}

interface AeonIdlEvent {
  name: string;
  discriminator: number[];
}

interface AeonIdlType {
  name: string;
  type: { kind: string; fields?: AeonIdlArg[] };
}

const instructions = (idlJson as { instructions: AeonIdlInstruction[] }).instructions;
const idlEvents = (idlJson as { events: AeonIdlEvent[] }).events ?? [];
const idlTypes = (idlJson as { types: AeonIdlType[] }).types ?? [];

function discHex(bytes: number[]): string {
  return Buffer.from(bytes).toString("hex");
}

/** Map of first-8-bytes hex (lowercase) → instruction name, from the IDL only. */
export const AEON_INSTRUCTION_BY_DISC: ReadonlyMap<string, string> = new Map(
  instructions.map((ix) => [discHex(ix.discriminator), ix.name]),
);

export const AEON_INSTRUCTION_ARGS: ReadonlyMap<string, AeonIdlArg[]> = new Map(
  instructions.map((ix) => [ix.name, ix.args ?? []]),
);

export const AEON_IDL_INSTRUCTION_COUNT = instructions.length;

export function aeonInstructionName(discHex8: string): string | null {
  return AEON_INSTRUCTION_BY_DISC.get(discHex8.toLowerCase()) ?? null;
}

export function aeonInstructionDiscBytes(name: string): Uint8Array | null {
  const ix = instructions.find((i) => i.name === name);
  if (!ix) return null;
  return Uint8Array.from(ix.discriminator);
}

/** IDL account names in declared order for an instruction. */
export function aeonInstructionAccountNames(instructionName: string): string[] {
  const ix = instructions.find((i) => i.name === instructionName);
  return (ix?.accounts ?? []).map((account) => account.name);
}

/** Map IDL account names onto the instruction's account keys. */
export function namedInstructionAccounts(
  instructionName: string,
  accounts: string[],
): Record<string, string> {
  const names = aeonInstructionAccountNames(instructionName);
  const named: Record<string, string> = {};
  for (let i = 0; i < names.length && i < accounts.length; i++) {
    named[names[i]] = accounts[i];
  }
  return named;
}

function asU64(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return 0;
}

/**
 * Map issue_authority account keys using IDL names, skipping optional accounts
 * that the program omits when parent_id=0 or bond_amount=0.
 */
export function namedIssueAuthorityAccounts(
  accounts: string[],
  args: Record<string, unknown> | null,
): Record<string, string> {
  const skip = new Set<string>();
  if (asU64(args?.parent_id) === 0) skip.add("parent_authority");
  if (asU64(args?.bond_amount) <= 0) {
    skip.add("bond");
    skip.add("agent_vault");
    skip.add("bond_vault");
    skip.add("aeon_mint");
    skip.add("token_program");
    skip.add("associated_token_program");
  }
  const names = aeonInstructionAccountNames("issue_authority").filter((name) => !skip.has(name));
  const named: Record<string, string> = {};
  for (let i = 0; i < names.length && i < accounts.length; i++) {
    named[names[i]] = accounts[i];
  }
  return named;
}

export const AEON_EVENT_BY_DISC: ReadonlyMap<string, string> = new Map(
  idlEvents.map((event) => [discHex(event.discriminator), event.name]),
);

export function aeonEventName(discHex8: string): string | null {
  return AEON_EVENT_BY_DISC.get(discHex8.toLowerCase()) ?? null;
}

export function aeonEventDiscBytes(name: string): Uint8Array | null {
  const event = idlEvents.find((item) => item.name === name);
  if (!event) return null;
  return Uint8Array.from(event.discriminator);
}

function eventFields(eventName: string): AeonIdlArg[] | null {
  const spec = idlTypes.find((item) => item.name === eventName);
  if (!spec || spec.type.kind !== "struct" || !spec.type.fields) return null;
  return spec.type.fields;
}

/**
 * Decode Helius instruction `data` (base58 of disc‖args, or hex) to raw bytes.
 * Returns null if the string cannot be decoded.
 */
export function decodeInstructionDataBytes(data: string): Buffer | null {
  const trimmed = data.trim();
  if (!trimmed) return null;
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0 && trimmed.length >= 16) {
    try {
      return Buffer.from(trimmed, "hex");
    } catch {
      /* fall through to base58 */
    }
  }
  try {
    return Buffer.from(bs58.decode(trimmed));
  } catch {
    return null;
  }
}

function readU64(buf: Buffer, offset: number): { value: bigint; offset: number } | null {
  if (offset + 8 > buf.length) return null;
  return { value: buf.readBigUInt64LE(offset), offset: offset + 8 };
}

function readU16(buf: Buffer, offset: number): { value: number; offset: number } | null {
  if (offset + 2 > buf.length) return null;
  return { value: buf.readUInt16LE(offset), offset: offset + 2 };
}

function readU8(buf: Buffer, offset: number): { value: number; offset: number } | null {
  if (offset + 1 > buf.length) return null;
  return { value: buf.readUInt8(offset), offset: offset + 1 };
}

function readBytes(buf: Buffer, offset: number, n: number): { value: Buffer; offset: number } | null {
  if (offset + n > buf.length) return null;
  return { value: buf.subarray(offset, offset + n), offset: offset + n };
}

function decodeType(
  buf: Buffer,
  offset: number,
  type: unknown,
): { value: unknown; offset: number } | null {
  if (type === "u64") {
    const r = readU64(buf, offset);
    if (!r) return null;
    const n = r.value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(r.value) : r.value.toString();
    return { value: n, offset: r.offset };
  }
  if (type === "u16") {
    const r = readU16(buf, offset);
    if (!r) return null;
    return { value: r.value, offset: r.offset };
  }
  if (type === "u8" || type === "bool") {
    const r = readU8(buf, offset);
    if (!r) return null;
    return { value: type === "bool" ? r.value !== 0 : r.value, offset: r.offset };
  }
  if (type === "pubkey") {
    const r = readBytes(buf, offset, 32);
    if (!r) return null;
    return { value: bs58.encode(r.value), offset: r.offset };
  }
  if (type === "bytes") {
    if (offset + 4 > buf.length) return null;
    const len = buf.readUInt32LE(offset);
    return decodeType(buf, offset + 4, { array: ["u8", len] });
  }
  if (type && typeof type === "object") {
    const t = type as { vec?: unknown; array?: [unknown, number] };
    if (t.vec) {
      if (offset + 4 > buf.length) return null;
      const len = buf.readUInt32LE(offset);
      let o = offset + 4;
      const items: unknown[] = [];
      for (let i = 0; i < len; i++) {
        const item = decodeType(buf, o, t.vec);
        if (!item) return null;
        items.push(item.value);
        o = item.offset;
      }
      return { value: items, offset: o };
    }
    if (t.array) {
      const [elem, n] = t.array;
      if (elem === "u8") {
        const r = readBytes(buf, offset, n);
        if (!r) return null;
        return { value: r.value.toString("hex"), offset: r.offset };
      }
      let o = offset;
      const items: unknown[] = [];
      for (let i = 0; i < n; i++) {
        const item = decodeType(buf, o, elem);
        if (!item) return null;
        items.push(item.value);
        o = item.offset;
      }
      return { value: items, offset: o };
    }
  }
  return null;
}

/** Borsh-decode instruction args after the 8-byte discriminator, using IDL types. */
export function decodeAeonArgs(
  instructionName: string,
  data: Buffer,
): Record<string, unknown> | null {
  const args = AEON_INSTRUCTION_ARGS.get(instructionName);
  if (!args) return null;
  let offset = 8;
  const out: Record<string, unknown> = {};
  for (const arg of args) {
    const decoded = decodeType(data, offset, arg.type);
    if (!decoded) return null;
    out[arg.name] = decoded.value;
    offset = decoded.offset;
  }
  return out;
}

/** Borsh-decode an Anchor event payload (discriminator + IDL event fields). */
export function decodeAeonEvent(
  eventName: string,
  data: Buffer,
): Record<string, unknown> | null {
  const fields = eventFields(eventName);
  if (!fields) return null;
  let offset = 8;
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const decoded = decodeType(data, offset, field.type);
    if (!decoded) return null;
    out[field.name] = decoded.value;
    offset = decoded.offset;
  }
  return out;
}
