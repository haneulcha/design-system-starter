import { describe, it, expect } from "vitest";
import { deltaEOk, hueFamily } from "../../src/lab/accent-scale/metric.js";

describe("deltaEOk", () => {
  it("is 0 for identical colors", () => {
    expect(deltaEOk("#3b82f6", "#3b82f6")).toBe(0);
  });
  it("is ~1 for white vs black (Oklab L 1→0)", () => {
    expect(deltaEOk("#ffffff", "#000000")).toBeCloseTo(1, 1);
  });
  it("is small for near-identical colors", () => {
    expect(deltaEOk("#3b82f6", "#3b83f7")).toBeLessThan(0.01);
  });
});

describe("hueFamily", () => {
  // 경계는 accent-baseline.md 의 family 구간을 따른다
  it.each([
    [0, "red"], [355, "red"], [30, "orange"], [60, "yellow"],
    [100, "green"], [180, "cyan"], [255, "blue"], [280, "purple"], [330, "magenta"],
  ])("classifies h=%d as %s", (h, family) => {
    expect(hueFamily(h as number)).toBe(family);
  });
});
