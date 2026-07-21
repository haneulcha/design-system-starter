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

describe("study notes (교보재 카피)", () => {
  it("every registered algorithm carries a nonempty description", async () => {
    const { ALGORITHMS } = await import("../../src/lab/accent-scale/index.js");
    for (const algo of ALGORITHMS) {
      expect(algo.description.length, `${algo.id} description`).toBeGreaterThan(10);
    }
  });
  it("REF_NOTES covers every reference source used by the lab", async () => {
    const { REF_NOTES } = await import("../../src/lab/accent-scale/lab-data.js");
    for (const source of ["tailwind", "radix"]) {
      expect(REF_NOTES[source], `REF_NOTES.${source}`).toBeTruthy();
    }
  });
});

describe("GLOSSARY", () => {
  it("has unique terms with nonempty definitions", async () => {
    const { GLOSSARY } = await import("../../src/lab/accent-scale/lab-data.js");
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(8);
    expect(new Set(GLOSSARY.map(([t]) => t)).size).toBe(GLOSSARY.length);
    for (const [term, def] of GLOSSARY) expect(def.length, term).toBeGreaterThan(5);
  });
});
