import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { radixAlgorithm } from "../../src/lab/accent-scale/radix.js";
import { oklchToHex } from "../../src/generator/color.js";
import { deltaEOk } from "../../src/lab/accent-scale/metric.js";
import type { ReferenceSet } from "../../src/lab/accent-scale/bench.js";

const radixRef: ReferenceSet = JSON.parse(
  readFileSync("data/references/radix-light.json", "utf8"),
);

describe("radixAlgorithm", () => {
  it("round-trips radix blue: step-9 anchor reproduces the original scale", () => {
    const blue = radixRef.palettes.blue;
    const derived = radixAlgorithm.derive(blue[8], { count: 12, anchorIndex: 8 });
    const perStop = derived.map((c, i) => deltaEOk(oklchToHex(c), blue[i]));
    const mean = perStop.reduce((a, b) => a + b, 0) / perStop.length;
    // 원본 알고리즘에 원본 앵커를 넣으면 거의 원본이 나와야 한다.
    // (포팅 검증 게이트 — 실패하면 포팅이 잘못된 것)
    expect(mean).toBeLessThan(0.05);
    expect(Math.max(...perStop)).toBeLessThan(0.12);
  });

  it("returns 12 steps light→dark", () => {
    const scale = radixAlgorithm.derive("#0090ff", { count: 12, anchorIndex: 8 });
    expect(scale).toHaveLength(12);
    expect(scale[0].l).toBeGreaterThan(scale[11].l);
  });
});
