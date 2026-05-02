import { describe, it, expect } from "vitest";
import {
  buildSamples,
  profileSystem,
  hexToOklch,
  IMPLICIT_CHROMA_MAX,
} from "../../scripts/analysis/color-roles/neutral-baseline.js";
import type { MatchedRow } from "../../scripts/analysis/color-roles/dictionary.js";

const matchedRow = (overrides: Partial<MatchedRow>): MatchedRow => ({
  system: "x",
  section_heading: "Neutral Scale",
  item_label: "L",
  hex: null,
  css_var: null,
  token_ref: null,
  description: "",
  description_first_keywords: [],
  match_kind: "matched",
  matched_role: "neutral",
  ...overrides,
});

describe("buildSamples", () => {
  it("uses explicit neutrals when present", () => {
    const rows = [
      matchedRow({ system: "ibm", hex: "#161616", matched_role: "neutral" }),
      matchedRow({ system: "ibm", hex: "#f4f4f4", matched_role: "neutral" }),
      matchedRow({ system: "ibm", hex: "#0f62fe", matched_role: "accent", section_heading: "Primary" }),
    ];
    const samples = buildSamples(rows);
    const ibm = samples.get("ibm")!;
    expect(ibm).toHaveLength(2);
    expect(ibm.every((s) => s.source === "explicit")).toBe(true);
  });

  it("falls back to implicit reconstruction (low-chroma surface/text) when no explicit neutrals", () => {
    const rows = [
      matchedRow({ system: "minimal", hex: "#ffffff", matched_role: "surface", section_heading: "Surface" }),
      matchedRow({ system: "minimal", hex: "#f7f7f7", matched_role: "surface", section_heading: "Surface" }),
      matchedRow({ system: "minimal", hex: "#222222", matched_role: "text", section_heading: "Text" }),
      matchedRow({ system: "minimal", hex: "#ff385c", matched_role: "accent", section_heading: "Primary" }),
    ];
    const samples = buildSamples(rows);
    const m = samples.get("minimal")!;
    expect(m).toHaveLength(3);
    expect(m.every((s) => s.source === "implicit")).toBe(true);
    expect(m.map((s) => s.hex)).toEqual(["#ffffff", "#f7f7f7", "#222222"]);
  });

  it("filters out high-chroma surface rows during implicit reconstruction", () => {
    const rows = [
      matchedRow({ system: "tinted", hex: "#ffffff", matched_role: "surface" }),
      matchedRow({ system: "tinted", hex: "#f1f5ff", matched_role: "surface" }),
      matchedRow({ system: "tinted", hex: "#edfce9", matched_role: "surface" }),
    ];
    const samples = buildSamples(rows);
    const t = samples.get("tinted")!;
    for (const s of t) {
      expect(s.c).toBeLessThanOrEqual(IMPLICIT_CHROMA_MAX);
    }
  });

  it("returns nothing for systems with no neutral signal", () => {
    const rows = [matchedRow({ system: "empty", hex: null, matched_role: "neutral" })];
    const samples = buildSamples(rows);
    expect(samples.has("empty")).toBe(false);
  });

  it("explicit takes priority even when surface/text are also present", () => {
    const rows = [
      matchedRow({ system: "both", hex: "#161616", matched_role: "neutral" }),
      matchedRow({ system: "both", hex: "#ffffff", matched_role: "surface" }),
    ];
    const samples = buildSamples(rows);
    const both = samples.get("both")!;
    expect(both.every((s) => s.source === "explicit")).toBe(true);
  });
});

describe("profileSystem", () => {
  it("derives stop count, L range, C max from samples", () => {
    const samples = [
      { system: "x", source: "explicit" as const, hex: "#000", l: 0.05, c: 0, h: null },
      { system: "x", source: "explicit" as const, hex: "#fff", l: 0.99, c: 0, h: null },
      { system: "x", source: "explicit" as const, hex: "#888", l: 0.5, c: 0, h: null },
    ];
    const p = profileSystem("x", samples);
    expect(p.stop_count).toBe(3);
    expect(p.l_min).toBeCloseTo(0.05);
    expect(p.l_max).toBeCloseTo(0.99);
    expect(p.tint).toBe("achromatic");
  });

  it("classifies tint by hue when chroma exceeds threshold", () => {
    const samples = [
      { system: "warm", source: "explicit" as const, hex: "#x", l: 0.5, c: 0.02, h: 30 },
    ];
    expect(profileSystem("warm", samples).tint).toBe("warm");

    const cool = [
      { system: "cool", source: "explicit" as const, hex: "#x", l: 0.5, c: 0.02, h: 230 },
    ];
    expect(profileSystem("cool", cool).tint).toBe("cool");
  });

  it("dedupes samples with identical lightness", () => {
    const samples = [
      { system: "x", source: "explicit" as const, hex: "#fff", l: 1.0, c: 0, h: null },
      { system: "x", source: "explicit" as const, hex: "#fefefe", l: 1.0, c: 0, h: null },
    ];
    expect(profileSystem("x", samples).stop_count).toBe(1);
  });

  it("returns 'none' source when samples is empty", () => {
    const p = profileSystem("nothing", []);
    expect(p.source).toBe("none");
    expect(p.stop_count).toBe(0);
  });
});

describe("hexToOklch", () => {
  it("returns null for invalid hex", () => {
    expect(hexToOklch("not-a-color")).toBeNull();
  });

  it("returns C=0 for pure grays", () => {
    const o = hexToOklch("#888888");
    expect(o).not.toBeNull();
    expect(o!.c).toBeLessThan(0.001);
  });
});
