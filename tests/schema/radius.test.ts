// tests/schema/radius.test.ts
//
// Validates that the radius category schema (src/schema/radius.ts)
// faithfully encodes docs/research/radius-category-proposal.md.

import { describe, it, expect } from "vitest";
import {
  SCALE,
  SPECIAL,
  STYLE_PROFILES,
  RADIUS_STYLE_OPTIONS,
  DEFAULT_RADIUS_KNOBS,
  FIXED_TOKEN_VALUES,
} from "../../src/schema/radius.js";

// ─── Scale shape — proposal §2 ──────────────────────────────────────────────

describe("SCALE — proposal §2", () => {
  it("has exactly 8 stops [0, 2, 4, 6, 8, 12, 16, 24]", () => {
    expect([...SCALE]).toEqual([0, 2, 4, 6, 8, 12, 16, 24]);
  });

  it("is monotonically increasing", () => {
    for (let i = 1; i < SCALE.length; i++) {
      expect(SCALE[i]).toBeGreaterThan(SCALE[i - 1]);
    }
  });

  it("starts at 0 (sharp/none case)", () => {
    expect(SCALE[0]).toBe(0);
  });

  it("caps at 24 (largest container; corpus mode)", () => {
    expect(SCALE[SCALE.length - 1]).toBe(24);
  });
});

// ─── Special values — proposal §2 ───────────────────────────────────────────

describe("SPECIAL — proposal §2", () => {
  it("pill is '9999px' (universally portable)", () => {
    expect(SPECIAL.pill).toBe("9999px");
  });

  it("circle is '50%'", () => {
    expect(SPECIAL.circle).toBe("50%");
  });
});

// ─── Style profiles — proposal §5 ───────────────────────────────────────────

describe("STYLE_PROFILES — proposal §5", () => {
  it("has exactly 4 styles: sharp, standard, generous, pill", () => {
    expect(Object.keys(STYLE_PROFILES).sort()).toEqual([
      "generous", "pill", "sharp", "standard",
    ]);
  });

  it("RADIUS_STYLE_OPTIONS lists all 4 styles", () => {
    expect([...RADIUS_STYLE_OPTIONS].sort()).toEqual([
      "generous", "pill", "sharp", "standard",
    ]);
  });

  it("sharp: button=4, input=4, card=8", () => {
    expect(STYLE_PROFILES.sharp).toEqual({ button: 4, input: 4, card: 8 });
  });

  it("standard: button=8, input=8, card=12", () => {
    expect(STYLE_PROFILES.standard).toEqual({ button: 8, input: 8, card: 12 });
  });

  it("generous: button=12, input=8, card=16", () => {
    expect(STYLE_PROFILES.generous).toEqual({ button: 12, input: 8, card: 16 });
  });

  it("pill: button='pill', input='pill', card=12", () => {
    expect(STYLE_PROFILES.pill).toEqual({ button: "pill", input: "pill", card: 12 });
  });

  it("every numeric profile value is in SCALE", () => {
    for (const [styleName, profile] of Object.entries(STYLE_PROFILES)) {
      for (const [key, value] of Object.entries(profile)) {
        if (typeof value === "number") {
          expect(SCALE, `${styleName}.${key}=${value} not in SCALE`).toContain(value);
        }
      }
    }
  });

  it("default style is 'standard'", () => {
    expect(DEFAULT_RADIUS_KNOBS.style).toBe("standard");
  });
});

// ─── Embedded patterns — proposal §4 ────────────────────────────────────────

describe("Embedded patterns — proposal §4", () => {
  it("button === input across sharp/standard/pill styles (mostly paired)", () => {
    expect(STYLE_PROFILES.sharp.button).toBe(STYLE_PROFILES.sharp.input);
    expect(STYLE_PROFILES.standard.button).toBe(STYLE_PROFILES.standard.input);
    expect(STYLE_PROFILES.pill.button).toBe(STYLE_PROFILES.pill.input);
  });

  it("generous deliberately decouples button (12) from input (8)", () => {
    expect(STYLE_PROFILES.generous.button).toBe(12);
    expect(STYLE_PROFILES.generous.input).toBe(8);
  });

  it("card > button for sharp/standard/generous (numeric comparison)", () => {
    for (const style of ["sharp", "standard", "generous"] as const) {
      const p = STYLE_PROFILES[style];
      if (typeof p.button === "number") {
        expect(p.card, `${style}: card(${p.card}) should be > button(${p.button})`)
          .toBeGreaterThan(p.button);
      }
    }
  });
});

// ─── Fixed token values — proposal §3 ───────────────────────────────────────

describe("FIXED_TOKEN_VALUES — proposal §3", () => {
  it("none=0, subtle=4, large=24, pill='9999px', circle='50%'", () => {
    expect(FIXED_TOKEN_VALUES).toEqual({
      none: 0,
      subtle: 4,
      large: 24,
      pill: "9999px",
      circle: "50%",
    });
  });

  it("none, subtle, large numeric values are in SCALE", () => {
    expect(SCALE).toContain(FIXED_TOKEN_VALUES.none);
    expect(SCALE).toContain(FIXED_TOKEN_VALUES.subtle);
    expect(SCALE).toContain(FIXED_TOKEN_VALUES.large);
  });

  it("pill matches SPECIAL.pill", () => {
    expect(FIXED_TOKEN_VALUES.pill).toBe(SPECIAL.pill);
  });

  it("circle matches SPECIAL.circle", () => {
    expect(FIXED_TOKEN_VALUES.circle).toBe(SPECIAL.circle);
  });
});

// ─── Reserved stops — proposal §2 ───────────────────────────────────────────

describe("Reserved scale stops — proposal §2", () => {
  it("2 and 6 are in SCALE but not consumed by any token at any style", () => {
    const consumedValues = new Set<number | string>([
      ...Object.values(FIXED_TOKEN_VALUES),
      ...Object.values(STYLE_PROFILES).flatMap((p) => Object.values(p)),
    ]);
    for (const reserved of [2, 6]) {
      expect(SCALE).toContain(reserved);
      expect(consumedValues.has(reserved)).toBe(false);
    }
  });
});
