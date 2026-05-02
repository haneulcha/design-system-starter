// tests/schema/typography.test.ts
//
// Validates that the typography category schema (src/schema/typography.ts)
// faithfully encodes docs/research/type-category-proposal.md.
// Each block cites the proposal section it locks down.

import { describe, it, expect } from "vitest";
import {
  SIZE_SCALE,
  WEIGHT_SCALE,
  LINE_HEIGHT_SCALE,
  LETTER_SPACING_VALUES,
  FONT_FAMILY_CHAINS,
  CATEGORY_PROFILES,
  DEFAULT_TYPOGRAPHY_KNOBS,
  HEADING_STYLE_OPTIONS,
} from "../../src/schema/typography.js";

// ─── Scale consistency — proposal §2 ────────────────────────────────────────

describe("CATEGORY_PROFILES scale consistency — proposal §2", () => {
  it("every profile size is in SIZE_SCALE", () => {
    for (const [key, profile] of Object.entries(CATEGORY_PROFILES)) {
      expect(SIZE_SCALE, `${key}.size=${profile.size} not in SIZE_SCALE`).toContain(
        profile.size,
      );
    }
  });

  it("every profile weight is in WEIGHT_SCALE", () => {
    for (const [key, profile] of Object.entries(CATEGORY_PROFILES)) {
      expect(
        WEIGHT_SCALE,
        `${key}.weight=${profile.weight} not in WEIGHT_SCALE`,
      ).toContain(profile.weight);
    }
  });

  it("every profile lineHeight is in LINE_HEIGHT_SCALE", () => {
    for (const [key, profile] of Object.entries(CATEGORY_PROFILES)) {
      expect(
        LINE_HEIGHT_SCALE,
        `${key}.lineHeight=${profile.lineHeight} not in LINE_HEIGHT_SCALE`,
      ).toContain(profile.lineHeight);
    }
  });

  it("every profile letterSpacing is in LETTER_SPACING_VALUES", () => {
    for (const [key, profile] of Object.entries(CATEGORY_PROFILES)) {
      expect(
        LETTER_SPACING_VALUES,
        `${key}.letterSpacing=${profile.letterSpacing} not in LETTER_SPACING_VALUES`,
      ).toContain(profile.letterSpacing);
    }
  });

  it("every profile fontFamily is 'sans', 'mono', or 'serif'", () => {
    const validFamilies = ["sans", "mono", "serif"];
    for (const [key, profile] of Object.entries(CATEGORY_PROFILES)) {
      expect(
        validFamilies,
        `${key}.fontFamily=${profile.fontFamily} is not a valid family`,
      ).toContain(profile.fontFamily);
    }
  });
});

// ─── Profile cardinality — proposal §3 ──────────────────────────────────────

describe("CATEGORY_PROFILES cardinality — proposal §3", () => {
  it("has exactly 20 entries", () => {
    expect(Object.keys(CATEGORY_PROFILES)).toHaveLength(20);
  });

  it("contains exactly the expected set of keys", () => {
    const expectedKeys = [
      "badge",
      "body.lg",
      "body.md",
      "body.sm",
      "button.md",
      "button.sm",
      "caption.md",
      "caption.sm",
      "caption.xs",
      "card",
      "code.md",
      "code.sm",
      "code.xs",
      "heading.lg",
      "heading.md",
      "heading.sm",
      "heading.xl",
      "heading.xs",
      "link",
      "nav",
    ];
    const actualKeys = Object.keys(CATEGORY_PROFILES).sort();
    expect(actualKeys).toEqual(expectedKeys);
  });
});

// ─── Pattern checks — proposal §4 ───────────────────────────────────────────

describe("Embedded patterns — proposal §4", () => {
  it("heading.xl and heading.lg use weight 500 (inverse curve)", () => {
    expect(CATEGORY_PROFILES["heading.xl"].weight).toBe(500);
    expect(CATEGORY_PROFILES["heading.lg"].weight).toBe(500);
  });

  it("heading.md, heading.sm, heading.xs use weight 600 (inverse curve)", () => {
    expect(CATEGORY_PROFILES["heading.md"].weight).toBe(600);
    expect(CATEGORY_PROFILES["heading.sm"].weight).toBe(600);
    expect(CATEGORY_PROFILES["heading.xs"].weight).toBe(600);
  });

  it("heading sizes decrease monotonically: xl > lg > md > sm > xs", () => {
    const xl = CATEGORY_PROFILES["heading.xl"].size;
    const lg = CATEGORY_PROFILES["heading.lg"].size;
    const md = CATEGORY_PROFILES["heading.md"].size;
    const sm = CATEGORY_PROFILES["heading.sm"].size;
    const xs = CATEGORY_PROFILES["heading.xs"].size;
    expect(xl).toBeGreaterThan(lg);
    expect(lg).toBeGreaterThan(md);
    expect(md).toBeGreaterThan(sm);
    expect(sm).toBeGreaterThan(xs);
  });

  it("heading lineHeights increase monotonically: xl <= lg < md < sm < xs", () => {
    const xl = CATEGORY_PROFILES["heading.xl"].lineHeight;
    const lg = CATEGORY_PROFILES["heading.lg"].lineHeight;
    const md = CATEGORY_PROFILES["heading.md"].lineHeight;
    const sm = CATEGORY_PROFILES["heading.sm"].lineHeight;
    const xs = CATEGORY_PROFILES["heading.xs"].lineHeight;
    expect(xl).toBeLessThanOrEqual(lg);
    expect(lg).toBeLessThan(md);
    expect(md).toBeLessThan(sm);
    expect(sm).toBeLessThan(xs);
  });

  it("all body.* profiles have lineHeight 1.5", () => {
    expect(CATEGORY_PROFILES["body.lg"].lineHeight).toBe(1.5);
    expect(CATEGORY_PROFILES["body.md"].lineHeight).toBe(1.5);
    expect(CATEGORY_PROFILES["body.sm"].lineHeight).toBe(1.5);
  });

  it("all code.* profiles have fontFamily 'mono'", () => {
    expect(CATEGORY_PROFILES["code.md"].fontFamily).toBe("mono");
    expect(CATEGORY_PROFILES["code.sm"].fontFamily).toBe("mono");
    expect(CATEGORY_PROFILES["code.xs"].fontFamily).toBe("mono");
  });

  it("all non-code profiles have fontFamily 'sans' (v1 has no serif defaults)", () => {
    const nonCodeKeys = Object.keys(CATEGORY_PROFILES).filter(
      (k) => !k.startsWith("code"),
    );
    for (const key of nonCodeKeys) {
      expect(CATEGORY_PROFILES[key].fontFamily, `${key} should be sans`).toBe("sans");
    }
  });

  it("only heading.xl, heading.lg, badge have non-zero letter-spacing", () => {
    const nonZeroKeys = Object.entries(CATEGORY_PROFILES)
      .filter(([, p]) => p.letterSpacing !== "0")
      .map(([k]) => k)
      .sort();
    expect(nonZeroKeys).toEqual(["badge", "heading.lg", "heading.xl"]);
  });
});

// ─── Defaults — proposal §5 ─────────────────────────────────────────────────

describe("DEFAULT_TYPOGRAPHY_KNOBS — proposal §5", () => {
  it("fontFamily.sans defaults to null (use Inter primary)", () => {
    expect(DEFAULT_TYPOGRAPHY_KNOBS.fontFamily.sans).toBeNull();
  });

  it("fontFamily.mono defaults to null (use Geist Mono primary)", () => {
    expect(DEFAULT_TYPOGRAPHY_KNOBS.fontFamily.mono).toBeNull();
  });

  it("headingStyle defaults to 'default' (inverse curve)", () => {
    expect(DEFAULT_TYPOGRAPHY_KNOBS.headingStyle).toBe("default");
  });
});

// ─── HEADING_STYLE_OPTIONS — proposal §5 ────────────────────────────────────

describe("HEADING_STYLE_OPTIONS — proposal §5", () => {
  it("contains exactly ['default', 'flat', 'bold']", () => {
    expect(HEADING_STYLE_OPTIONS).toEqual(["default", "flat", "bold"]);
  });
});

// ─── Font chain shape — proposal §2 ─────────────────────────────────────────

describe("FONT_FAMILY_CHAINS — proposal §2", () => {
  it("sans is a non-empty string with Korean fallback (Pretendard)", () => {
    expect(typeof FONT_FAMILY_CHAINS.sans).toBe("string");
    expect(FONT_FAMILY_CHAINS.sans.length).toBeGreaterThan(0);
    expect(FONT_FAMILY_CHAINS.sans).toContain("Pretendard");
  });

  it("mono is a non-empty string with Korean fallback (D2Coding)", () => {
    expect(typeof FONT_FAMILY_CHAINS.mono).toBe("string");
    expect(FONT_FAMILY_CHAINS.mono.length).toBeGreaterThan(0);
    expect(FONT_FAMILY_CHAINS.mono).toContain("D2Coding");
  });

  it("serif is a non-empty string with Korean fallback (Noto Serif KR)", () => {
    expect(typeof FONT_FAMILY_CHAINS.serif).toBe("string");
    expect(FONT_FAMILY_CHAINS.serif.length).toBeGreaterThan(0);
    expect(FONT_FAMILY_CHAINS.serif).toContain("Noto Serif KR");
  });
});

// ─── Exact profile values spot-check — proposal §3 ──────────────────────────

describe("CATEGORY_PROFILES exact values — proposal §3", () => {
  it("heading.xl: sans 64 500 1.1 -0.02em", () => {
    expect(CATEGORY_PROFILES["heading.xl"]).toEqual({
      fontFamily: "sans",
      size: 64,
      weight: 500,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
    });
  });

  it("heading.lg: sans 48 500 1.1 -0.02em", () => {
    expect(CATEGORY_PROFILES["heading.lg"]).toEqual({
      fontFamily: "sans",
      size: 48,
      weight: 500,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
    });
  });

  it("heading.md: sans 32 600 1.2 0", () => {
    expect(CATEGORY_PROFILES["heading.md"]).toEqual({
      fontFamily: "sans",
      size: 32,
      weight: 600,
      lineHeight: 1.2,
      letterSpacing: "0",
    });
  });

  it("code.xs: mono 10 400 1.5 0", () => {
    expect(CATEGORY_PROFILES["code.xs"]).toEqual({
      fontFamily: "mono",
      size: 10,
      weight: 400,
      lineHeight: 1.5,
      letterSpacing: "0",
    });
  });

  it("badge: sans 12 600 1.4 0.05em", () => {
    expect(CATEGORY_PROFILES["badge"]).toEqual({
      fontFamily: "sans",
      size: 12,
      weight: 600,
      lineHeight: 1.4,
      letterSpacing: "0.05em",
    });
  });

  it("card: sans 24 600 1.3 0", () => {
    expect(CATEGORY_PROFILES["card"]).toEqual({
      fontFamily: "sans",
      size: 24,
      weight: 600,
      lineHeight: 1.3,
      letterSpacing: "0",
    });
  });

  it("nav: sans 14 500 1.4 0", () => {
    expect(CATEGORY_PROFILES["nav"]).toEqual({
      fontFamily: "sans",
      size: 14,
      weight: 500,
      lineHeight: 1.4,
      letterSpacing: "0",
    });
  });

  it("link: sans 14 400 1.5 0", () => {
    expect(CATEGORY_PROFILES["link"]).toEqual({
      fontFamily: "sans",
      size: 14,
      weight: 400,
      lineHeight: 1.5,
      letterSpacing: "0",
    });
  });
});

// ─── Scale values — proposal §2 ─────────────────────────────────────────────

describe("Tier 1 scale values — proposal §2", () => {
  it("SIZE_SCALE has 13 stops: [10,11,12,14,16,18,20,24,28,32,36,48,64]", () => {
    expect([...SIZE_SCALE]).toEqual([10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64]);
  });

  it("WEIGHT_SCALE has 4 stops: [400,500,600,700]", () => {
    expect([...WEIGHT_SCALE]).toEqual([400, 500, 600, 700]);
  });

  it("LINE_HEIGHT_SCALE has 6 stops: [1.0,1.1,1.2,1.3,1.4,1.5]", () => {
    expect([...LINE_HEIGHT_SCALE]).toEqual([1.0, 1.1, 1.2, 1.3, 1.4, 1.5]);
  });

  it("LETTER_SPACING_VALUES has 3 entries: ['-0.02em','0','0.05em']", () => {
    expect([...LETTER_SPACING_VALUES]).toEqual(["-0.02em", "0", "0.05em"]);
  });
});
