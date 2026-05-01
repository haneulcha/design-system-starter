import { describe, it, expect } from "vitest";
import {
  frequencyByRawRole,
  frequencyBySize,
  frequencyByWeight,
} from "../../scripts/analysis/type-styles/frequency.js";
import type { TypeStyleRow } from "../../scripts/analysis/type-styles/types.js";

function row(over: Partial<TypeStyleRow>): TypeStyleRow {
  return {
    system: "a",
    rawRole: "Body",
    font: null,
    sizePx: 16,
    weight: 400,
    lineHeight: 1.5,
    letterSpacingPx: 0,
    features: [],
    notes: "",
    rowIndex: 0,
    ...over,
  };
}

describe("frequencyByRawRole", () => {
  it("tallies by case-folded raw role across systems", () => {
    const rows = [
      row({ system: "a", rawRole: "Body" }),
      row({ system: "b", rawRole: "body" }),
      row({ system: "a", rawRole: "Heading 1" }),
    ];
    const freq = frequencyByRawRole(rows);
    expect(freq[0].key).toBe("body");
    expect(freq[0].count).toBe(2);
    expect(freq[0].systems).toEqual(["a", "b"]);
  });
});

describe("frequencyBySize", () => {
  it("tallies sizePx as integers", () => {
    const rows = [row({ sizePx: 16, system: "a" }), row({ sizePx: 16, system: "b" }), row({ sizePx: 14, system: "a" })];
    const freq = frequencyBySize(rows);
    expect(freq[0].key).toBe("16");
    expect(freq[0].count).toBe(2);
  });
  it("ignores rows with null sizePx", () => {
    const rows = [row({ sizePx: null }), row({ sizePx: 16 })];
    expect(frequencyBySize(rows)).toHaveLength(1);
  });
});

describe("frequencyByWeight", () => {
  it("ignores rows with null weight", () => {
    const rows = [row({ weight: 400, system: "a" }), row({ weight: null, system: "b" })];
    const freq = frequencyByWeight(rows);
    expect(freq).toHaveLength(1);
    expect(freq[0].key).toBe("400");
  });
});
