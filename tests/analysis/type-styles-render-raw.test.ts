import { describe, it, expect } from "vitest";
import { renderRawReport, renderRawCsv } from "../../scripts/analysis/type-styles/render-raw.js";
import type { SystemResult } from "../../scripts/analysis/type-styles/types.js";

const SAMPLE: SystemResult[] = [
  {
    system: "alpha",
    hasTypographySection: true,
    rows: [
      { system: "alpha", rawRole: "Body", font: "Inter", sizePx: 16, weight: 400, lineHeight: 1.5, letterSpacingPx: 0, features: [], notes: "x", rowIndex: 0 },
    ],
    fontFamily: { primary: "Inter", primaryFallbacks: [], mono: null, monoFallbacks: [], display: null, openTypeFeatures: [] },
    principlesText: "",
  },
  {
    system: "beta",
    hasTypographySection: false,
    rows: [],
    fontFamily: { primary: null, primaryFallbacks: [], mono: null, monoFallbacks: [], display: null, openTypeFeatures: [] },
    principlesText: "",
  },
];

describe("renderRawReport", () => {
  const md = renderRawReport(SAMPLE);
  it("includes a coverage summary", () => {
    expect(md).toMatch(/2 systems/);
    expect(md).toMatch(/1 with Typography section/);
    expect(md).toMatch(/beta/);
  });
  it("includes a raw-role frequency table", () => {
    expect(md).toMatch(/^## Raw role frequency/m);
    expect(md).toMatch(/\bbody\b/);
  });
  it("includes a size frequency table", () => {
    expect(md).toMatch(/^## Size frequency/m);
    expect(md).toMatch(/\b16\b/);
  });
});

describe("renderRawCsv", () => {
  it("produces a header and one row per extracted style", () => {
    const csv = renderRawCsv(SAMPLE);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("system,rawRole,font,sizePx,weight");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("alpha,Body,Inter,16,400");
  });
});
