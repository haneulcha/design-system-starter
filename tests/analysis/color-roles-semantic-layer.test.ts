import { describe, it, expect } from "vitest";
import {
  buildSemanticSamples,
  classifyOrigin,
  computeRoleStats,
  profilePerSystemRole,
} from "../../scripts/analysis/color-roles/semantic-layer.js";
import type { MatchedRow } from "../../scripts/analysis/color-roles/dictionary.js";
import type { SystemAccentProfile } from "../../scripts/analysis/color-roles/accent-baseline.js";

const semanticRow = (overrides: Partial<MatchedRow> & { matched_role: "surface" | "text" | "semantic" }): MatchedRow => ({
  system: "x",
  section_heading: "Surface",
  item_label: "L",
  hex: null,
  css_var: null,
  token_ref: null,
  description: "",
  description_first_keywords: [],
  match_kind: "matched",
  ...overrides,
});

const accent = (h: number): SystemAccentProfile => ({
  system: "x",
  total_stops: 3,
  primary: {
    primary_h: h,
    stop_count: 3,
    l_min: 0.4,
    l_max: 0.7,
    c_max: 0.2,
    c_median: 0.18,
    family: "blue",
  },
  secondary_clusters: [],
  multi_hue: false,
  has_no_chromatic_samples: false,
});

describe("classifyOrigin", () => {
  it("returns no_color when c is null", () => {
    expect(classifyOrigin(null, null, null)).toBe("no_color");
  });

  it("returns neutral for low chroma regardless of accent profile", () => {
    expect(classifyOrigin(0.01, 100, accent(240))).toBe("neutral");
    expect(classifyOrigin(0.025, null, null)).toBe("neutral");
  });

  it("returns accent when chromatic and hue matches primary accent", () => {
    expect(classifyOrigin(0.18, 250, accent(240))).toBe("accent");
  });

  it("returns unique when chromatic but hue does not match primary accent", () => {
    expect(classifyOrigin(0.20, 30, accent(240))).toBe("unique");
  });

  it("returns unique when system has no primary accent", () => {
    expect(classifyOrigin(0.20, 240, null)).toBe("unique");
  });

  it("respects ±20° hue tolerance", () => {
    expect(classifyOrigin(0.18, 220, accent(240))).toBe("accent");
    expect(classifyOrigin(0.18, 219, accent(240))).toBe("unique");
  });
});

describe("buildSemanticSamples", () => {
  it("only includes surface/text/semantic rows", () => {
    const rows = [
      semanticRow({ matched_role: "surface", hex: "#fff" }),
      semanticRow({ matched_role: "text", hex: "#000" }),
      semanticRow({ matched_role: "semantic", hex: "#f00" }),
      semanticRow({ matched_role: "accent" as never, hex: "#0ff" }),
    ];
    const samples = buildSemanticSamples(rows, new Map());
    expect(samples).toHaveLength(3);
  });

  it("classifies origin per row", () => {
    const rows = [
      semanticRow({ system: "a", matched_role: "surface", hex: "#ffffff" }),
      semanticRow({ system: "a", matched_role: "semantic", hex: "#ff0000" }),
    ];
    const map = new Map([["a", accent(240)]]);
    const samples = buildSemanticSamples(rows, map);
    expect(samples[0].base_origin).toBe("neutral");
    expect(samples[1].base_origin).toBe("unique");
  });

  it("emits no_color row when hex is missing or unparseable", () => {
    const rows = [
      semanticRow({ matched_role: "surface", hex: null }),
      semanticRow({ matched_role: "surface", hex: "not-a-hex" }),
    ];
    const samples = buildSemanticSamples(rows, new Map());
    expect(samples.every((s) => s.base_origin === "no_color")).toBe(true);
  });
});

describe("profilePerSystemRole", () => {
  it("aggregates rows and distinct hexes per (system, role)", () => {
    const rows = [
      semanticRow({ system: "a", matched_role: "surface", hex: "#fff" }),
      semanticRow({ system: "a", matched_role: "surface", hex: "#fff" }),
      semanticRow({ system: "a", matched_role: "surface", hex: "#eee" }),
      semanticRow({ system: "a", matched_role: "text", hex: "#000" }),
    ];
    const samples = buildSemanticSamples(rows, new Map());
    const profiles = profilePerSystemRole(samples);
    const aSurface = profiles.find((p) => p.system === "a" && p.role === "surface")!;
    expect(aSurface.row_count).toBe(3);
    expect(aSurface.distinct_hex_count).toBe(2);
  });
});

describe("computeRoleStats", () => {
  it("produces medians and origin shares per role", () => {
    const rows = [
      semanticRow({ system: "a", matched_role: "surface", hex: "#ffffff" }),
      semanticRow({ system: "a", matched_role: "surface", hex: "#fafafa" }),
      semanticRow({ system: "b", matched_role: "surface", hex: "#000000" }),
    ];
    const samples = buildSemanticSamples(rows, new Map());
    const stats = computeRoleStats("surface", samples);
    expect(stats.systems_present).toBe(2);
    expect(stats.origin_share.neutral).toBeGreaterThan(0.5);
  });
});
