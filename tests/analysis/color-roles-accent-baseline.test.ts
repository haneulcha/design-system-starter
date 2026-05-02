import { describe, it, expect } from "vitest";
import {
  buildSamples,
  profileSystem,
  circularDistance,
  chromaWeightedMeanHue,
  classifyHueFamily,
} from "../../scripts/analysis/color-roles/accent-baseline.js";
import type { MatchedRow } from "../../scripts/analysis/color-roles/dictionary.js";
import type { AccentSample } from "../../scripts/analysis/color-roles/accent-baseline.js";

const accentRow = (overrides: Partial<MatchedRow>): MatchedRow => ({
  system: "x",
  section_heading: "Primary",
  item_label: "L",
  hex: null,
  css_var: null,
  token_ref: null,
  description: "",
  description_first_keywords: [],
  match_kind: "matched",
  matched_role: "accent",
  ...overrides,
});

const sample = (overrides: Partial<AccentSample>): AccentSample => ({
  system: "x",
  hex: "#000",
  l: 0.5,
  c: 0.1,
  h: 0,
  ...overrides,
});

describe("circularDistance", () => {
  it("handles wraparound near 0/360", () => {
    expect(circularDistance(350, 10)).toBe(20);
    expect(circularDistance(10, 350)).toBe(20);
  });

  it("returns straight distance when within 180°", () => {
    expect(circularDistance(100, 200)).toBe(100);
  });

  it("returns 0 for identical hues", () => {
    expect(circularDistance(45, 45)).toBe(0);
  });
});

describe("chromaWeightedMeanHue", () => {
  it("returns null when no chromatic samples", () => {
    expect(chromaWeightedMeanHue([{ c: 0, h: 100 }])).toBeNull();
    expect(chromaWeightedMeanHue([])).toBeNull();
  });

  it("returns the hue when single chromatic sample", () => {
    const h = chromaWeightedMeanHue([{ c: 0.2, h: 240 }]);
    expect(h).toBeCloseTo(240, 0);
  });

  it("handles wraparound — averages hues straddling 0°", () => {
    const h = chromaWeightedMeanHue([
      { c: 0.2, h: 350 },
      { c: 0.2, h: 10 },
    ]);
    expect(h).not.toBeNull();
    expect(circularDistance(h!, 0)).toBeLessThan(2);
  });
});

describe("classifyHueFamily", () => {
  it.each([
    [10, "red"],
    [355, "red"],
    [30, "orange"],
    [70, "yellow"],
    [120, "green"],
    [180, "cyan"],
    [240, "blue"],
    [280, "purple"],
    [330, "magenta"],
  ] as const)("h=%i → %s", (h, expected) => {
    expect(classifyHueFamily(h)).toBe(expected);
  });

  it("returns achromatic when h is null", () => {
    expect(classifyHueFamily(null)).toBe("achromatic");
  });
});

describe("buildSamples", () => {
  it("collects accent rows with hex; computes OKLCH", () => {
    const rows = [
      accentRow({ system: "a", hex: "#ff0000" }),
      accentRow({ system: "a", hex: "#cc0000" }),
      accentRow({ system: "a", hex: null }),
      accentRow({ system: "b", hex: "#0000ff" }),
    ];
    const samples = buildSamples(rows);
    expect(samples.get("a")).toHaveLength(2);
    expect(samples.get("b")).toHaveLength(1);
  });

  it("ignores non-accent rows", () => {
    const rows = [
      accentRow({ hex: "#ff0000", matched_role: "surface" }),
      accentRow({ hex: "#0000ff", matched_role: "accent" }),
    ];
    const samples = buildSamples(rows);
    expect(samples.get("x")).toHaveLength(1);
  });
});

describe("profileSystem", () => {
  it("identifies single-hue accent (Rausch-like)", () => {
    const samples = [
      sample({ hex: "#ff385c", c: 0.20, h: 17, l: 0.66 }),
      sample({ hex: "#e00b41", c: 0.22, h: 22, l: 0.52 }),
      sample({ hex: "#ffd1da", c: 0.05, h: 10, l: 0.90 }),
    ];
    const p = profileSystem("airbnb-like", samples);
    expect(p.primary).not.toBeNull();
    expect(p.primary!.family).toBe("red");
    expect(p.multi_hue).toBe(false);
    expect(p.total_stops).toBe(3);
  });

  it("detects multi-hue (figma gradient-like)", () => {
    const samples = [
      sample({ hex: "#0099ff", c: 0.18, h: 240, l: 0.6 }),
      sample({ hex: "#ff00aa", c: 0.20, h: 340, l: 0.5 }),
      sample({ hex: "#ffcc00", c: 0.18, h: 80, l: 0.85 }),
    ];
    const p = profileSystem("multi", samples);
    expect(p.multi_hue).toBe(true);
    expect(p.secondary_clusters.length).toBeGreaterThanOrEqual(1);
  });

  it("returns no_chromatic when all samples below threshold", () => {
    const samples = [
      sample({ c: 0.01, h: 0 }),
      sample({ c: 0.005, h: 100 }),
    ];
    const p = profileSystem("mono", samples);
    expect(p.has_no_chromatic_samples).toBe(true);
    expect(p.primary).toBeNull();
  });

  it("returns empty profile for no samples", () => {
    const p = profileSystem("empty", []);
    expect(p.total_stops).toBe(0);
    expect(p.primary).toBeNull();
  });
});
