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
  it("marks exactly the verbatim-preserved input stop as anchor (naive)", () => {
    const stops = nativeScale(naiveAlgorithm, "#3b82f6");
    expect(stops[naiveAlgorithm.nativeSpec.anchorIndex].anchor).toBe(true);
    expect(stops.filter((s) => s.anchor)).toHaveLength(1);
  });
  it("marks no anchor when a fixed-ladder algorithm drops the input (v1)", async () => {
    const { v1Algorithm } = await import("../../src/lab/accent-scale/v1.js");
    const stops = nativeScale(v1Algorithm, "#3b82f6");
    expect(stops.some((s) => s.anchor)).toBe(false);
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
  it("marks a reference stop as anchor when the input hex is in the palette", () => {
    const near = nearestReferences("#3b82f6", REFS);
    expect(near[0].stops.map((s) => s.anchor)).toEqual([false, true]);
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

describe("EVAL_PRESETS", () => {
  it("has unique valid hexes with labels (eye-eval doc과 1:1 계약)", async () => {
    const { EVAL_PRESETS } = await import("../../src/lab/accent-scale/lab-data.js");
    expect(EVAL_PRESETS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(EVAL_PRESETS.map((p) => p.hex)).size).toBe(EVAL_PRESETS.length);
    for (const p of EVAL_PRESETS) {
      expect(p.hex, p.label).toMatch(/^#[0-9a-f]{6}$/);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.why.length).toBeGreaterThan(3);
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
