import { describe, expect, it } from "vitest";
import {
  ageLabel,
  buildGradeCard,
  cardImageUrl,
  cardShareTitle,
  unindexedCard,
} from "@/lib/grade-card";
import { renderGradeCardPng } from "@/lib/card/png.server";
import { renderGradeCardSvg } from "@/lib/card/svg";
import type { Agent } from "@/lib/agents";

const NOW = Date.parse("2026-09-05T00:00:00.000Z");

function agent(overrides: Partial<Agent> = {}): Agent {
  return {
    mint: "9116eaELxZheLwJNu73LxQVsuaiugH8e11onkEw4ku9R",
    name: "Test Agent",
    symbol: "test",
    grade: "SPX B",
    score: 61,
    verdict: "Execution building.",
    totalBuybacksCount: 3,
    failedWindows: 2,
    operatorVerified: false,
    events: [],
    ...overrides,
  } as unknown as Agent;
}

describe("ageLabel", () => {
  it("prints NONE for missing or unparseable timestamps", () => {
    expect(ageLabel(null, NOW)).toBe("NONE");
    expect(ageLabel(undefined, NOW)).toBe("NONE");
    expect(ageLabel("not-a-date", NOW)).toBe("NONE");
  });

  it("prints minutes, hours and days", () => {
    expect(ageLabel(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe("5m ago");
    expect(ageLabel(new Date(NOW - 4 * 3_600_000).toISOString(), NOW)).toBe("4h ago");
    expect(ageLabel(new Date(NOW - 11 * 86_400_000).toISOString(), NOW)).toBe("11d ago");
  });
});

describe("buildGradeCard", () => {
  it("uses the newest on-chain buyback and burn events", () => {
    const card = buildGradeCard(
      agent({
        events: [
          { type: "BUYBACK_EXECUTED", iso: new Date(NOW - 11 * 86_400_000).toISOString() },
          { type: "SWAP_EXECUTED", iso: new Date(NOW - 30 * 86_400_000).toISOString() },
          { type: "BURN_CONFIRMED", iso: new Date(NOW - 11 * 86_400_000).toISOString() },
        ],
      } as Partial<Agent>),
      NOW,
    );
    expect(card.ticker).toBe("$TEST");
    expect(card.rows[0]).toEqual({ label: "Last buyback", value: "11d ago" });
    expect(card.rows[1]).toEqual({ label: "Last burn", value: "11d ago" });
    expect(card.rows[2]).toEqual({ label: "Buybacks", value: "3" });
    expect(card.rows[3]).toEqual({ label: "Failed windows", value: "2" });
    expect(card.operator).toBe("UNVERIFIED");
    expect(card.danger).toBe(false);
  });

  it("prints NONE / 0 rather than inventing data", () => {
    const card = buildGradeCard(
      agent({ totalBuybacksCount: 0, failedWindows: 0, symbol: "" } as Partial<Agent>),
      NOW,
    );
    expect(card.ticker).toBe("$AGENT");
    expect(card.rows.map((r) => r.value)).toEqual(["NONE", "NONE", "0", "0"]);
  });

  it("flags failing grades as danger and honours the verified operator", () => {
    expect(buildGradeCard(agent({ grade: "SPX D" }), NOW).danger).toBe(true);
    expect(buildGradeCard(agent({ grade: "SPX404" }), NOW).danger).toBe(true);
    expect(buildGradeCard(agent({ grade: "SPX AAA" }), NOW).danger).toBe(false);
    expect(buildGradeCard(agent({ operatorVerified: true }), NOW).operator).toBe("VERIFIED");
  });

  it("builds the share title and absolute image URL", () => {
    const card = buildGradeCard(agent({ grade: "SPX D" }), NOW);
    expect(cardShareTitle(card)).toBe("$TEST · SPX D · last buyback NONE");
    expect(cardImageUrl(card.mint)).toBe(`https://spx402.com/api/public/card/${card.mint}.png`);
  });
});

describe("renderers", () => {
  const card = unindexedCard("9116eaELxZheLwJNu73LxQVsuaiugH8e11onkEw4ku9R");

  it("emits a valid PNG at both share sizes", () => {
    for (const size of [
      { width: 1200, height: 630 },
      { width: 1080, height: 1080 },
    ]) {
      const png = renderGradeCardPng(card, size);
      expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      const dv = new DataView(png.buffer, png.byteOffset);
      expect(dv.getUint32(16)).toBe(size.width);
      expect(dv.getUint32(20)).toBe(size.height);
      // IEND terminator present.
      expect(Buffer.from(png.slice(-8, -4)).toString("ascii")).toBe("IEND");
    }
  });

  it("emits SVG carrying the card facts", () => {
    const svg = renderGradeCardSvg(card);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("SPX404");
    expect(svg).toContain(card.url);
    expect(svg).toContain("UNVERIFIED");
  });
});
