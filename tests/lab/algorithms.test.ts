import { describe, it, expect } from "vitest";
import { v1Algorithm } from "../../src/lab/palette/v1.js";
import { naiveAlgorithm } from "../../src/lab/palette/naive.js";
import { hctAlgorithm } from "../../src/lab/palette/hct.js";
import { leonardoAlgorithm } from "../../src/lab/palette/leonardo.js";
import { oursAlgorithm } from "../../src/lab/palette/ours.js";
import { parsePrimary } from "../../src/generator/color.js";
import type { AccentAlgorithm } from "../../src/lab/palette/types.js";

const SPEC = { count: 11, anchorIndex: 5 };
const ANCHOR = "#3b82f6"; // tailwind blue-500 근방

function checkContract(algo: AccentAlgorithm) {
  const scale = algo.derive(ANCHOR, SPEC);
  it(`${algo.id}: returns spec.count colors`, () => {
    expect(scale).toHaveLength(SPEC.count);
  });
  it(`${algo.id}: lightness strictly decreases (밝은→어두운)`, () => {
    for (let i = 1; i < scale.length; i++) {
      expect(scale[i].l).toBeLessThan(scale[i - 1].l);
    }
  });
  it(`${algo.id}: preserves anchor hue within 15deg`, () => {
    for (const c of scale) {
      if (c.c < 0.02) continue; // 무채색 끝단은 hue 무의미
      let d = Math.abs(c.h - 259.2) % 360; // #3b82f6 ≈ oklch h 259.2
      if (d > 180) d = 360 - d;
      expect(d).toBeLessThan(15);
    }
  });
}

describe("v1Algorithm", () => checkContract(v1Algorithm));
describe("naiveAlgorithm", () => {
  checkContract(naiveAlgorithm);
  it("returns the anchor color exactly at anchorIndex", () => {
    const scale = naiveAlgorithm.derive(ANCHOR, SPEC);
    const anchor = scale[SPEC.anchorIndex];
    expect(anchor.l).toBeCloseTo(0.6, 1); // #3b82f6 L≈0.62
    expect(anchor.c).toBeGreaterThan(0.15);
  });
});
describe("hctAlgorithm", () => checkContract(hctAlgorithm));
describe("leonardoAlgorithm", () => checkContract(leonardoAlgorithm));

describe("oursAlgorithm", () => {
  checkContract(oursAlgorithm);
  it("returns the anchor verbatim at anchorIndex", () => {
    const scale = oursAlgorithm.derive(ANCHOR, SPEC);
    const anchor = parsePrimary(ANCHOR);
    expect(scale[SPEC.anchorIndex]).toEqual(anchor);
  });
  it("keeps chroma at the light end (나이브의 탁한 밝은 끝 교정)", () => {
    const scale = oursAlgorithm.derive(ANCHOR, SPEC);
    expect(scale[0].c).toBeGreaterThan(0.01);
  });
  it.each(["#eab308", "#93c5fd", "#1e40af", "#cc785c"])(
    "lightness stays strictly decreasing for extreme anchor %s",
    (hex) => {
      const scale = oursAlgorithm.derive(hex, SPEC);
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i].l, `stop ${i}`).toBeLessThan(scale[i - 1].l);
      }
    },
  );
});
