// tests/schema/spacing.test.ts
//
// Validates that the spacing category schema (src/schema/spacing.ts)
// faithfully encodes docs/research/spacing-category-proposal.md.
// Each block cites the proposal section it locks down.

import { describe, it, expect } from "vitest";
import {
  SCALE,
  BASE_ALIASES,
  DENSITY_OPTIONS,
  DENSITY_TO_SECTION_PX,
  DEFAULT_SPACING_KNOBS,
} from "../../src/schema/spacing.js";

// ─── Scale shape — proposal §2 ──────────────────────────────────────────────

describe("SCALE — proposal §2", () => {
  it("has exactly 12 stops [2, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96]", () => {
    expect([...SCALE]).toEqual([2, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96]);
  });

  it("is monotonically increasing", () => {
    for (let i = 1; i < SCALE.length; i++) {
      expect(SCALE[i]).toBeGreaterThan(SCALE[i - 1]);
    }
  });

  it("every stop is a positive integer", () => {
    for (const stop of SCALE) {
      expect(Number.isInteger(stop)).toBe(true);
      expect(stop).toBeGreaterThan(0);
    }
  });

  it("all alias values are present in SCALE", () => {
    for (const [name, value] of Object.entries(BASE_ALIASES)) {
      expect(SCALE, `BASE_ALIASES.${name}=${value} not in SCALE`).toContain(value);
    }
  });

  it("all density-mode section values are present in SCALE", () => {
    for (const [mode, value] of Object.entries(DENSITY_TO_SECTION_PX)) {
      expect(SCALE, `DENSITY_TO_SECTION_PX.${mode}=${value} not in SCALE`).toContain(value);
    }
  });
});

// ─── Alias cardinality — proposal §3 ────────────────────────────────────────

describe("BASE_ALIASES — proposal §3", () => {
  it("has exactly 7 entries (section is computed, not in BASE_ALIASES)", () => {
    expect(Object.keys(BASE_ALIASES)).toHaveLength(7);
  });

  it("contains exactly the expected alias names", () => {
    expect(Object.keys(BASE_ALIASES).sort()).toEqual([
      "lg", "md", "sm", "xl", "xs", "xxl", "xxs",
    ]);
  });

  it("does NOT include `section` (computed at generation time)", () => {
    expect(BASE_ALIASES).not.toHaveProperty("section");
  });

  it("alias values match proposal §3 exactly", () => {
    expect(BASE_ALIASES).toEqual({
      xxs: 4,
      xs: 8,
      sm: 12,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    });
  });

  it("aliases are monotonically increasing in semantic order", () => {
    const ordered = ["xxs", "xs", "sm", "md", "lg", "xl", "xxl"] as const;
    for (let i = 1; i < ordered.length; i++) {
      expect(BASE_ALIASES[ordered[i]]).toBeGreaterThan(BASE_ALIASES[ordered[i - 1]]);
    }
  });
});

// ─── Density knob — proposal §5 ─────────────────────────────────────────────

describe("Density knob — proposal §5", () => {
  it("DENSITY_OPTIONS lists exactly comfortable, compact, dense", () => {
    expect([...DENSITY_OPTIONS]).toEqual(["comfortable", "compact", "dense"]);
  });

  it("DENSITY_TO_SECTION_PX maps each mode to the proposal value", () => {
    expect(DENSITY_TO_SECTION_PX).toEqual({
      comfortable: 96,
      compact: 80,
      dense: 64,
    });
  });

  it("default density is 'comfortable'", () => {
    expect(DEFAULT_SPACING_KNOBS.density).toBe("comfortable");
  });
});

// ─── Embedded patterns — proposal §4 ────────────────────────────────────────

describe("Embedded patterns — proposal §4", () => {
  it("every alias is a 4-multiple", () => {
    for (const [name, value] of Object.entries(BASE_ALIASES)) {
      expect(value % 4, `${name}=${value} not a 4-multiple`).toBe(0);
    }
  });

  it("md=16 is the universal-component step", () => {
    expect(BASE_ALIASES.md).toBe(16);
  });

  it("xxl→section default jump is 2× (48 → 96)", () => {
    expect(DENSITY_TO_SECTION_PX.comfortable).toBe(BASE_ALIASES.xxl * 2);
  });

  it("reserved stops 2, 20, 64, 80 are in SCALE but not in BASE_ALIASES", () => {
    const aliasValues = new Set(Object.values(BASE_ALIASES));
    for (const reserved of [2, 20]) {
      expect(SCALE).toContain(reserved);
      expect(aliasValues.has(reserved)).toBe(false);
    }
    // 64 and 80 are reserved at the alias level but reachable through density
    for (const densityReserved of [64, 80]) {
      expect(SCALE).toContain(densityReserved);
      expect(aliasValues.has(densityReserved)).toBe(false);
    }
  });
});
