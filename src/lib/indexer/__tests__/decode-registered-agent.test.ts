// Section D — registered-agent diff decoder (decode-registered-agent.server.ts).
//
// This decoder is a pure snapshot diff (no transaction payload), so the cases
// are expressed directly rather than through captured fixtures.

import { describe, it, expect } from "vitest";
import {
  diffRegisteredAgent,
  type RegisteredAgentSnapshot,
} from "@/lib/indexer/decode-registered-agent.server";

const ASSET = "4kbLbEDLFm9rGCbcuJq5Ryv9UwVJj7QsSg4bLzTz5g6t";
const AT = new Date("2026-03-01T12:00:00.000Z");
const SLUG = Math.floor(AT.getTime() / 1000);

function snap(over: Partial<RegisteredAgentSnapshot> = {}): RegisteredAgentSnapshot {
  return { asset: ASSET, identityOwner: null, metadataUri: null, ...over };
}

describe("D — registered-agent diff decoder", () => {
  it("D1_operator_changed — owner flip emits OPERATOR_CHANGED", () => {
    const events = diffRegisteredAgent(
      snap({ identityOwner: "OwnerAAA" }),
      snap({ identityOwner: "OwnerBBB" }),
      AT,
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("OPERATOR_CHANGED");
    expect(events[0].severity).toBe("warn");
    expect(events[0].signature).toBe(`opch-${ASSET}-${SLUG}`);
    expect(events[0].raw).toMatchObject({
      change: "identity_owner",
      from: "OwnerAAA",
      to: "OwnerBBB",
    });
  });

  it("D2_config_changed — metadata URI flip emits CONFIG_CHANGED", () => {
    const events = diffRegisteredAgent(
      snap({ metadataUri: "https://a.example/agent.json" }),
      snap({ metadataUri: "https://b.example/agent.json" }),
      AT,
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("CONFIG_CHANGED");
    expect(events[0].signature).toBe(`cfgch-${ASSET}-${SLUG}`);
  });

  it("both changes in one observation emit two events", () => {
    const events = diffRegisteredAgent(
      snap({ identityOwner: "OwnerAAA", metadataUri: "https://a.example/x.json" }),
      snap({ identityOwner: "OwnerBBB", metadataUri: "https://b.example/x.json" }),
      AT,
    );
    expect(events.map((e) => e.type)).toEqual(["OPERATOR_CHANGED", "CONFIG_CHANGED"]);
  });

  it("first observation (null → value) seeds without emitting", () => {
    expect(
      diffRegisteredAgent(
        snap(),
        snap({ identityOwner: "OwnerAAA", metadataUri: "https://a.example/x.json" }),
        AT,
      ),
    ).toEqual([]);
  });

  it("value → null (transient read failure) does not emit", () => {
    expect(diffRegisteredAgent(snap({ identityOwner: "OwnerAAA" }), snap(), AT)).toEqual([]);
  });

  it("identical snapshots emit nothing", () => {
    const s = snap({ identityOwner: "OwnerAAA", metadataUri: "https://a.example/x.json" });
    expect(diffRegisteredAgent(s, { ...s }, AT)).toEqual([]);
  });

  it("mismatched assets are refused outright", () => {
    expect(
      diffRegisteredAgent(
        snap({ identityOwner: "OwnerAAA" }),
        { asset: "OtherAsset", identityOwner: "OwnerBBB", metadataUri: null },
        AT,
      ),
    ).toEqual([]);
  });

  it("derived signatures are stable across reruns at the same observation time", () => {
    const a = diffRegisteredAgent(
      snap({ identityOwner: "OwnerAAA" }),
      snap({ identityOwner: "OwnerBBB" }),
      AT,
    );
    const b = diffRegisteredAgent(
      snap({ identityOwner: "OwnerAAA" }),
      snap({ identityOwner: "OwnerBBB" }),
      AT,
    );
    expect(a[0].signature).toBe(b[0].signature);
  });
});
