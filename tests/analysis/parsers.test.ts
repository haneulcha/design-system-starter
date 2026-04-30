import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { findSection } from "../../scripts/analysis/parsers/section.js";

describe("findSection", () => {
  const sample = `## 1. Theme

intro

## 2. Buttons

radius: 8px
shape: rounded

## 3. Cards

radius: 12px
`;

  it("returns body of named section, case-insensitive", () => {
    const buttons = findSection(sample, "Buttons");
    expect(buttons).toContain("radius: 8px");
    expect(buttons).not.toContain("intro");
    expect(buttons).not.toContain("Cards");
  });

  it("matches numbered headings (e.g., '## 2. Buttons')", () => {
    expect(findSection(sample, "Buttons")).toContain("radius: 8px");
  });

  it("returns null when section is missing", () => {
    expect(findSection(sample, "Animation")).toBeNull();
  });

  it("matches subsection headings of any level", () => {
    const subbed = `## Typography\n### Display Hero\n48px / 700\n### Body\n16px / 400\n`;
    const display = findSection(subbed, "Display Hero");
    expect(display).toContain("48px / 700");
    expect(display).not.toContain("16px / 400");
  });

  it("substring-matches verbose headings", () => {
    const md = `## 6. Depth & Elevation\n\nshadow: subtle\n\n## 7. Other\n`;
    expect(findSection(md, "Elevation")).toContain("shadow: subtle");
  });

  it("prefers earliest match when multiple substring hits exist", () => {
    const md = `## Display Hero\nA\n## Display Footer\nB\n`;
    expect(findSection(md, "Display")).toContain("A");
    expect(findSection(md, "Display")).not.toContain("B");
  });
});
