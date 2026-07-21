import { describe, it, expect } from "vitest";
import {
  benchPalette,
  summarize,
  corpusStats,
  renderReport,
} from "../../src/lab/accent-scale/bench.js";
import { naiveAlgorithm } from "../../src/lab/accent-scale/naive.js";
import type { ReferenceSet } from "../../src/lab/accent-scale/bench.js";

// 2-stop 초소형 레퍼런스 (파랑 계열): 검증 가능한 크기
const TINY_REF: ReferenceSet = {
  source: "tiny",
  version: "0",
  anchorIndex: 1,
  stopKeys: ["a", "b"],
  palettes: { blue: ["#dbeafe", "#3b82f6"] },
};

describe("benchPalette", () => {
  it("anchor stop has ~0 ΔE for naive (앵커를 그대로 반환하므로)", () => {
    const r = benchPalette(naiveAlgorithm, TINY_REF, "blue");
    expect(r.perStop).toHaveLength(2);
    // hex→oklch→hex 왕복 라운딩이 있어 정확히 0은 아님
    expect(r.perStop[1]).toBeLessThan(0.01);
    expect(r.family).toBe("blue");
    expect(r.mean).toBeCloseTo((r.perStop[0] + r.perStop[1]) / 2, 10);
    expect(r.max).toBeCloseTo(Math.max(r.perStop[0], r.perStop[1]), 10);
  });
});

describe("summarize", () => {
  it("aggregates mean/max per algorithm and per family", () => {
    const rows = [
      { algorithmId: "x", source: "s", palette: "p1", family: "blue" as const, perStop: [], mean: 0.1, max: 0.2 },
      { algorithmId: "x", source: "s", palette: "p2", family: "red" as const, perStop: [], mean: 0.3, max: 0.4 },
    ];
    const s = summarize(rows);
    expect(s.byAlgorithm.x.mean).toBeCloseTo(0.2, 5);
    expect(s.byAlgorithm.x.max).toBeCloseTo(0.4, 5);
    expect(s.byAlgorithmFamily.x.blue.mean).toBeCloseTo(0.1, 5);
  });
});

describe("corpusStats", () => {
  it("reports median C_max and anchor-window L range", () => {
    const s = corpusStats(naiveAlgorithm, [TINY_REF]);
    expect(s.medianCMax).toBeGreaterThan(0);
    expect(s.medianLLow).toBeLessThanOrEqual(s.medianLHigh);
  });
});

describe("renderReport", () => {
  it("emits a markdown doc with per-algorithm summary table", () => {
    const rows = [benchPalette(naiveAlgorithm, TINY_REF, "blue")];
    const md = renderReport(rows, [naiveAlgorithm], [TINY_REF]);
    expect(md).toContain("# Accent Scale Bench Report");
    expect(md).toContain("| naive |");
  });
});
