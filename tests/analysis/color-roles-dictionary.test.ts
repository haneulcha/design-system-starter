import { describe, it, expect } from "vitest";
import { classifyAll, validateDictionary } from "../../scripts/analysis/color-roles/dictionary.js";
import type { ColorItemRow } from "../../scripts/analysis/color-roles/types.js";

const baseRow = (heading: string, system = "x"): ColorItemRow => ({
  system,
  section_heading: heading,
  item_label: "L",
  hex: null,
  css_var: null,
  token_ref: null,
  description: "",
  description_first_keywords: [],
});

const dict = {
  version: 1,
  axis: "section_heading" as const,
  matching: "case_insensitive_exact" as const,
  groups: {
    accent: ["Primary", "Brand & Accent"],
    surface: ["Surface", "Surface & Background"],
  },
  exclude: ["Shadows", "Gradient System"],
};

describe("classifyAll", () => {
  it("matches headings to roles (case-insensitive)", () => {
    const rows = [baseRow("Primary"), baseRow("brand & accent"), baseRow("SURFACE")];
    const out = classifyAll(rows, dict);
    expect(out.map((r) => r.matched_role)).toEqual(["accent", "accent", "surface"]);
    expect(out.every((r) => r.match_kind === "matched")).toBe(true);
  });

  it("flags excluded headings as excluded with no role", () => {
    const out = classifyAll([baseRow("Shadows"), baseRow("Gradient System")], dict);
    expect(out.every((r) => r.match_kind === "excluded")).toBe(true);
    expect(out.every((r) => r.matched_role === null)).toBe(true);
  });

  it("flags unknown headings as unmatched", () => {
    const out = classifyAll([baseRow("Mystery Heading"), baseRow("(no heading)")], dict);
    expect(out.every((r) => r.match_kind === "unmatched")).toBe(true);
  });

  it("throws when a heading appears in multiple groups", () => {
    const conflicting = {
      ...dict,
      groups: { accent: ["Primary"], surface: ["Primary"] },
    };
    expect(() => classifyAll([baseRow("Primary")], conflicting)).toThrow(/multiple groups/);
  });

  it("throws when a heading is both grouped and excluded", () => {
    const overlap = { ...dict, exclude: ["Primary"] };
    expect(() => classifyAll([baseRow("Primary")], overlap)).toThrow(/group and exclude/);
  });
});

describe("validateDictionary", () => {
  it("rejects non-object input", () => {
    expect(() => validateDictionary(null)).toThrow();
    expect(() => validateDictionary("nope")).toThrow();
  });

  it("rejects wrong axis", () => {
    expect(() => validateDictionary({ ...dict, axis: "css_var" })).toThrow(/axis/);
  });

  it("rejects missing groups", () => {
    expect(() => validateDictionary({ axis: "section_heading", matching: "case_insensitive_exact", exclude: [] })).toThrow();
  });

  it("accepts valid dictionary", () => {
    expect(validateDictionary(dict)).toBeTruthy();
  });
});
