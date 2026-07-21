import { describe, it, expect } from "vitest";
import { nativeScale, nearestReferences } from "../../src/lab/accent-scale/lab-data.js";
import { naiveAlgorithm } from "../../src/lab/accent-scale/naive.js";
import type { ReferenceSet } from "../../src/lab/accent-scale/bench.js";

const REFS: ReferenceSet[] = [
  {
    source: "tiny", version: "0", anchorIndex: 1, stopKeys: ["a", "b"],
    palettes: {
      blue: ["#dbeafe", "#3b82f6"],   // h≈259
      red: ["#fee2e2", "#ef4444"],    // h≈25
    },
  },
];

describe("nativeScale", () => {
  it("returns nativeSpec.count stops with stable keys and hex values", () => {
    const stops = nativeScale(naiveAlgorithm, "#3b82f6");
    expect(stops).toHaveLength(naiveAlgorithm.nativeSpec.count);
    expect(stops.every((s) => /^#[0-9a-f]{6}$/.test(s.hex))).toBe(true);
    expect(new Set(stops.map((s) => s.key)).size).toBe(stops.length);
  });
});

describe("nearestReferences", () => {
  it("picks the closest-hue palette per source", () => {
    const near = nearestReferences("#2563eb", REFS); // 파랑 입력
    expect(near).toHaveLength(1);
    expect(near[0].palette).toBe("blue");
    expect(near[0].stops).toHaveLength(2);
  });
  it("picks red for a pinkish-red input (#e11d48, h≈17°)", () => {
    const near = nearestReferences("#e11d48", REFS);
    expect(near[0].palette).toBe("red");
  });
});
