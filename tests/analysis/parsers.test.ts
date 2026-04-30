import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { findSection } from "../../scripts/analysis/parsers/section.js";
import { parseBtnRadius, parseCardRadius } from "../../scripts/analysis/parsers/numeric.js";
import {
  parseHeadingWeight,
  parseBodyLineHeight,
  parseHeadingLetterSpacing,
} from "../../scripts/analysis/parsers/typography.js";
import { parseShadowIntensity, parseBtnShape } from "../../scripts/analysis/parsers/categorical.js";
import {
  parseBrandOklch,
  parseGrayChroma,
  parseAccentOffset,
} from "../../scripts/analysis/parsers/color.js";
import { parseDarkModePresent } from "../../scripts/analysis/parsers/modes.js";
import { detectFormat, extractYamlFrontmatter } from "../../scripts/analysis/parsers/format.js";
import { extractFromYaml } from "../../scripts/analysis/parsers/yaml-extract.js";

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

describe("parseShadowIntensity", () => {
  it.each<[string, number]>([
    ["## Elevation\n\nNo shadows used.\n", 0],
    ["## Elevation\n\nWhisper-light shadows on cards.\n", 1],
    ["## Elevation\n\nSubtle shadows for elevation.\n", 2],
    ["## Elevation\n\nMedium shadows.\n", 3],
    ["## Elevation\n\nDramatic, deep shadows.\n", 4],
  ])("classifies shadow intensity from %j", (md, expected) => {
    expect(parseShadowIntensity(md)).toBe(expected);
  });

  it("returns null on missing section", () => {
    expect(parseShadowIntensity("## Other\n")).toBeNull();
  });
});

describe("parseBtnShape", () => {
  it("classifies sharp (radius ≤ 2)", () => {
    expect(parseBtnShape("## Buttons\nradius: 0px\n")).toBe(0);
    expect(parseBtnShape("## Buttons\nradius: 2px\n")).toBe(0);
  });
  it("classifies standard (3-7)", () => {
    expect(parseBtnShape("## Buttons\nradius: 6px\n")).toBe(1);
  });
  it("classifies rounded (8-16)", () => {
    expect(parseBtnShape("## Buttons\nradius: 12px\n")).toBe(2);
  });
  it("classifies pill (≥ 9999 or 'pill' literal)", () => {
    expect(parseBtnShape("## Buttons\nradius: 9999px\n")).toBe(3);
    expect(parseBtnShape("## Buttons\npill button\n")).toBe(3);
  });
  it("returns null when section missing", () => {
    expect(parseBtnShape("## Other\n")).toBeNull();
  });
});

describe("color parsers", () => {
  const SAMPLE_COLORS = `## Colors

### Brand
Primary: #5e6ad2

### Accent
Primary: #d29c5e

### Gray
500: #828282
`;

  it("parseBrandOklch returns L/C/H for the brand primary", () => {
    const result = parseBrandOklch(SAMPLE_COLORS);
    expect(result).not.toBeNull();
    expect(result!.l).toBeGreaterThan(0);
    expect(result!.l).toBeLessThan(1);
    expect(result!.c).toBeGreaterThan(0);
    expect(result!.h).toBeGreaterThanOrEqual(0);
    expect(result!.h).toBeLessThan(360);
  });

  it("parseGrayChroma returns small chroma for neutral gray", () => {
    const c = parseGrayChroma(SAMPLE_COLORS);
    expect(c).not.toBeNull();
    expect(c).toBeLessThan(0.05);
  });

  it("parseAccentOffset returns hue difference modulo 360", () => {
    const offset = parseAccentOffset(SAMPLE_COLORS);
    expect(offset).not.toBeNull();
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThan(360);
  });

  it("returns null when Colors section missing", () => {
    expect(parseBrandOklch("## Other\n")).toBeNull();
    expect(parseGrayChroma("## Other\n")).toBeNull();
    expect(parseAccentOffset("## Other\n")).toBeNull();
  });
});

describe("real fixtures — colors (Format A only)", () => {
  it.each(["stripe", "vercel", "linear.app"])("%s yields brand OKLCH", (system) => {
    const md = readFileSync(`tests/analysis/fixtures/${system}.md`, "utf-8");
    expect(parseBrandOklch(md)).not.toBeNull();
  });
});

describe("parseDarkModePresent", () => {
  it("returns true when a Dark Mode subsection exists", () => {
    const md = `## 2. Color Palette\n\n### Dark Mode\n\nbackgrounds shift to navy.\n`;
    expect(parseDarkModePresent(md)).toBe(true);
  });
  it("returns true when Colors table has a Dark column", () => {
    const md = `## 2. Color\n\n| Step | Light | Dark |\n|---|---|---|\n| 100 | #fff | #000 |\n`;
    expect(parseDarkModePresent(md)).toBe(true);
  });
  it("returns true when prose mentions 'dark theme' or 'dark mode'", () => {
    const md = `## 1. Theme\n\nSupports light and dark theme out of the box.\n`;
    expect(parseDarkModePresent(md)).toBe(true);
  });
  it("returns false when no signal is present", () => {
    const md = `## 1. Theme\n\nA bright clean canvas.\n## 2. Color\n\nPrimary: #5e6ad2\n`;
    expect(parseDarkModePresent(md)).toBe(false);
  });
});

describe("detectFormat", () => {
  it("returns 'yaml' for files starting with ---", () => {
    expect(detectFormat("---\nname: Foo\n---\n")).toBe("yaml");
  });
  it("returns 'markdown' for files starting with #", () => {
    expect(detectFormat("# Design System\n## Colors\n")).toBe("markdown");
  });
  it("tolerates leading whitespace before ---", () => {
    expect(detectFormat("\n  ---\nname: Foo\n---\n")).toBe("yaml");
  });
});

describe("extractYamlFrontmatter", () => {
  it("returns YAML body between --- delimiters", () => {
    const md = "---\nname: Foo\nx: 1\n---\n# rest\n";
    expect(extractYamlFrontmatter(md)).toBe("name: Foo\nx: 1");
  });
  it("returns null on non-YAML files", () => {
    expect(extractYamlFrontmatter("# md\n## colors\n")).toBeNull();
  });
});

describe("extractFromYaml", () => {
  const SAMPLE_YAML = `---
version: alpha
name: SampleBrand
description: A clean playful brand using dark theme overlays.
colors:
  primary: "#ff385c"
  luxe: "#460479"
  body: "#3f3f3f"
  muted: "#929292"
  body-on-dark: "#ffffff"
  canvas: "#ffffff"
typography:
  display-xl:
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: -0.7px
  body-md:
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
rounded:
  none: 0px
  sm: 8px
  md: 14px
  lg: 20px
  full: 9999px
components:
  button-primary:
    rounded: "{rounded.sm}"
  card:
    rounded: "{rounded.md}"
---

# rest
`;

  it("returns ExtractedRecord with all 13 variables non-null where derivable", () => {
    const rec = extractFromYaml("samplebrand", SAMPLE_YAML);
    expect(rec).not.toBeNull();
    expect(rec!.system).toBe("samplebrand");
    expect(rec!.btn_radius).toBe(8);
    expect(rec!.card_radius).toBe(14);
    expect(rec!.heading_weight).toBe(700);
    expect(rec!.body_line_height).toBeCloseTo(1.5, 5);
    expect(rec!.heading_letter_spacing).toBe(-0.7);
    expect(rec!.brand_l).toBeGreaterThan(0);
    expect(rec!.brand_c).toBeGreaterThan(0);
    expect(rec!.brand_h).toBeGreaterThanOrEqual(0);
    expect(rec!.brand_h).toBeLessThan(360);
    expect(rec!.gray_chroma).not.toBeNull();
    expect(rec!.gray_chroma!).toBeLessThan(0.05);
    expect(rec!.accent_offset).not.toBeNull();
    expect(rec!.dark_mode_present).toBe(true);
    expect(rec!.btn_shape).toBe(2);
  });

  it("returns null for non-YAML input", () => {
    expect(extractFromYaml("foo", "# Plain markdown\n")).toBeNull();
  });

  it("handles missing accent — returns null for accent_offset", () => {
    const minimal = `---\nname: Mono\ncolors:\n  primary: "#0066cc"\n  ink: "#1d1d1f"\n  body: "#1d1d1f"\n  canvas: "#ffffff"\n---\n`;
    const rec = extractFromYaml("mono", minimal);
    expect(rec!.accent_offset).toBeNull();
  });
});

describe("extractFromYaml — real systems", () => {
  it.each(["airbnb", "apple"])("%s yields ≥ 8 non-null variables", (system) => {
    const path = `data/raw/${system}.md`;
    const fs = readFileSync(path, "utf-8");
    const rec = extractFromYaml(system, fs);
    expect(rec).not.toBeNull();
    const nonNull = Object.entries(rec!).filter(([k, v]) => k !== "system" && v !== null);
    expect(nonNull.length).toBeGreaterThanOrEqual(8);
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

describe("parseHeadingLetterSpacing — clip range", () => {
  const md = (ls: string) => `## Typography\n\n| Role | Size | Weight | LH | LS |\n|---|---|---|---|---|\n| Display Hero | 56px | 700 | 1.2 | ${ls} |\n`;

  it("returns null for letter-spacing > 2 px", () => {
    expect(parseHeadingLetterSpacing(md("70px"))).toBeNull();
    expect(parseHeadingLetterSpacing(md("53.2px"))).toBeNull();
  });

  it("returns null for letter-spacing < -6 px", () => {
    expect(parseHeadingLetterSpacing(md("-7.5px"))).toBeNull();
  });

  it("keeps in-range values unchanged", () => {
    expect(parseHeadingLetterSpacing(md("-2.4px"))).toBe(-2.4);
    expect(parseHeadingLetterSpacing(md("0px"))).toBe(0);
    expect(parseHeadingLetterSpacing(md("1.4px"))).toBe(1.4);
  });

  it("treats boundary values as in-range", () => {
    expect(parseHeadingLetterSpacing(md("-6px"))).toBe(-6);
    expect(parseHeadingLetterSpacing(md("2px"))).toBe(2);
  });
});

describe("extractFromYaml — letter_spacing clip", () => {
  const yamlMd = (ls: string) => `---
name: Demo
typography:
  hero-display:
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: ${ls}
colors:
  primary: "#0066cc"
---
`;

  it("clips out-of-range letter-spacing", () => {
    const r = extractFromYaml("demo", yamlMd("70px"));
    expect(r?.heading_letter_spacing).toBeNull();
  });

  it("keeps in-range letter-spacing", () => {
    const r = extractFromYaml("demo", yamlMd("-0.28px"));
    expect(r?.heading_letter_spacing).toBeCloseTo(-0.28);
  });
});

describe("extractFromYaml — pill detection", () => {
  const ymd = (roundedPill: string, btnRef: string) => `---
name: Demo
colors:
  primary: "#0066cc"
typography:
  display-lg:
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0
rounded:
  sm: 4px
  md: 8px
  pill: ${roundedPill}
components:
  button-primary:
    rounded: "${btnRef}"
---
`;

  it("flags fully-pill buttons (rounded.pill = 9999px) and zeroes btn_radius", () => {
    const r = extractFromYaml("demo", ymd("9999px", "{rounded.pill}"));
    expect(r?.is_fully_pill).toBe(true);
    expect(r?.btn_radius).toBeNull();
    expect(r?.btn_shape).toBe(3); // pill
  });

  it("returns the resolved px and is_fully_pill=false for finite pill (e.g., 32px)", () => {
    const r = extractFromYaml("demo", ymd("32px", "{rounded.pill}"));
    expect(r?.is_fully_pill).toBe(false);
    expect(r?.btn_radius).toBe(32);
    expect(r?.btn_shape).toBe(2); // rounded (32 >= 8 and < 999)
  });

  it("returns the resolved px and is_fully_pill=false for non-pill rounded refs", () => {
    const r = extractFromYaml("demo", ymd("9999px", "{rounded.md}"));
    expect(r?.is_fully_pill).toBe(false);
    expect(r?.btn_radius).toBe(8);
    expect(r?.btn_shape).toBe(2);
  });
});
