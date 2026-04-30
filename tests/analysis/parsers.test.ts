import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { findSection } from "../../scripts/analysis/parsers/section.js";
import { parseBtnRadius, parseCardRadius } from "../../scripts/analysis/parsers/numeric.js";
import {
  parseHeadingWeight,
  parseBodyLineHeight,
  parseHeadingLetterSpacing,
} from "../../scripts/analysis/parsers/typography.js";

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

describe("parseBtnRadius", () => {
  it("extracts the first px value in a Buttons section", () => {
    const md = "## Buttons\n\nborder-radius: 8px\nheight: 40px\n";
    expect(parseBtnRadius(md)).toBe(8);
  });

  it("returns null when section is missing", () => {
    expect(parseBtnRadius("## Other\n\nnothing here\n")).toBeNull();
  });

  it("handles 'pill' / 9999px as 9999", () => {
    expect(parseBtnRadius("## Buttons\n\nradius: 9999px (pill)\n")).toBe(9999);
  });
});

describe("parseCardRadius", () => {
  it("extracts the first px value in a Cards section", () => {
    const md = "## Cards\n\nborder-radius: 12px\n";
    expect(parseCardRadius(md)).toBe(12);
  });

  it("returns null when section is missing", () => {
    expect(parseCardRadius("## Other\n\nx\n")).toBeNull();
  });
});

describe("typography parsers", () => {
  const md = `## Typography

| Role | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|
| Display Hero | 48px | 700 | 1.10 | -0.70px |
| Body | 16px | 400 | 1.50 | normal |
`;

  it("parseHeadingWeight reads the largest-size row", () => {
    expect(parseHeadingWeight(md)).toBe(700);
  });

  it("parseBodyLineHeight reads the Body row", () => {
    expect(parseBodyLineHeight(md)).toBe(1.5);
  });

  it("parseHeadingLetterSpacing reads negative px from Display Hero", () => {
    expect(parseHeadingLetterSpacing(md)).toBe(-0.7);
  });

  it("returns null when Typography section missing", () => {
    expect(parseHeadingWeight("## Other\n")).toBeNull();
    expect(parseBodyLineHeight("## Other\n")).toBeNull();
    expect(parseHeadingLetterSpacing("## Other\n")).toBeNull();
  });

  it("treats 'normal' letter-spacing as 0", () => {
    const normal = `## Typography\n| Display Hero | 48px | 400 | 1.10 | normal |\n| Body | 16px | 400 | 1.50 | normal |\n`;
    expect(parseHeadingLetterSpacing(normal)).toBe(0);
  });
});

describe("real fixtures — typography (Format A only)", () => {
  it.each(["stripe", "vercel", "linear.app"])("%s yields all 3", (system) => {
    const md = readFileSync(`tests/analysis/fixtures/${system}.md`, "utf-8");
    expect(parseHeadingWeight(md)).toEqual(expect.any(Number));
    expect(parseBodyLineHeight(md)).toEqual(expect.any(Number));
    expect(parseHeadingLetterSpacing(md)).toEqual(expect.any(Number));
  });
});

describe("real fixtures — btn_radius (Format A only)", () => {
  // Format B (YAML) systems are covered by yaml-extract tests.
  it.each(["stripe", "vercel", "linear.app"])(
    "%s yields a numeric btn_radius",
    (system) => {
      const md = readFileSync(`tests/analysis/fixtures/${system}.md`, "utf-8");
      expect(parseBtnRadius(md)).toEqual(expect.any(Number));
    },
  );
});
