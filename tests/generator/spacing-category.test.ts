// tests/generator/spacing-category.test.ts
//
// Validates the spacing-category generator produces the contract described in
// docs/research/spacing-category-proposal.md.

import { describe, it, expect } from "vitest";
import {
  generateSpacingCategory,
  countEmittedTokens,
  resolveKnobs,
  resolveSection,
} from "../../src/generator/spacing-category.js";
import {
  BASE_ALIASES,
  DEFAULT_SPACING_KNOBS,
  SCALE,
} from "../../src/schema/spacing.js";

// ─── Defaults shape — proposal §7 ───────────────────────────────────────────

describe("generateSpacingCategory @ all defaults — proposal §7", () => {
  const tokens = generateSpacingCategory();

  it("returns the 12-stop SCALE unchanged", () => {
    expect([...tokens.scale]).toEqual([...SCALE]);
  });

  it("returns exactly 8 aliases (xxs..xxl + section)", () => {
    expect(Object.keys(tokens.aliases)).toHaveLength(8);
  });

  it("alias names are exactly xxs/xs/sm/md/lg/xl/xxl/section", () => {
    expect(Object.keys(tokens.aliases).sort()).toEqual(
      ["lg", "md", "section", "sm", "xl", "xs", "xxl", "xxs"],
    );
  });

  it("all 7 base aliases match BASE_ALIASES", () => {
    for (const [name, value] of Object.entries(BASE_ALIASES)) {
      expect(tokens.aliases[name as keyof typeof BASE_ALIASES]).toBe(value);
    }
  });

  it("section resolves to 96 (default density: comfortable)", () => {
    expect(tokens.aliases.section).toBe(96);
  });

  it("knobs reflect resolved defaults", () => {
    expect(tokens.knobs).toEqual(DEFAULT_SPACING_KNOBS);
  });
});

// ─── density knob — proposal §5 ──────────────────────────────────────────────

describe("density='compact' → section=80", () => {
  const tokens = generateSpacingCategory({ density: "compact" });

  it("section is 80", () => {
    expect(tokens.aliases.section).toBe(80);
  });

  it("non-section aliases are unchanged", () => {
    for (const [name, value] of Object.entries(BASE_ALIASES)) {
      expect(tokens.aliases[name as keyof typeof BASE_ALIASES]).toBe(value);
    }
  });

  it("knobs.density is 'compact'", () => {
    expect(tokens.knobs.density).toBe("compact");
  });
});

describe("density='dense' → section=64", () => {
  const tokens = generateSpacingCategory({ density: "dense" });

  it("section is 64", () => {
    expect(tokens.aliases.section).toBe(64);
  });

  it("non-section aliases are unchanged", () => {
    for (const [name, value] of Object.entries(BASE_ALIASES)) {
      expect(tokens.aliases[name as keyof typeof BASE_ALIASES]).toBe(value);
    }
  });
});

describe("density='comfortable' → section=96 (explicit default)", () => {
  it("section is 96", () => {
    const tokens = generateSpacingCategory({ density: "comfortable" });
    expect(tokens.aliases.section).toBe(96);
  });
});

// ─── resolveKnobs ────────────────────────────────────────────────────────────

describe("resolveKnobs", () => {
  it("undefined input → all defaults", () => {
    expect(resolveKnobs(undefined)).toEqual(DEFAULT_SPACING_KNOBS);
  });

  it("empty object input → all defaults", () => {
    expect(resolveKnobs({})).toEqual(DEFAULT_SPACING_KNOBS);
  });

  it("explicit density: 'compact' is honored", () => {
    expect(resolveKnobs({ density: "compact" })).toEqual({ density: "compact" });
  });

  it("invalid density string → falls back to 'comfortable'", () => {
    expect(resolveKnobs({ density: "ultra-tight" as never })).toEqual(
      DEFAULT_SPACING_KNOBS,
    );
  });
});

// ─── resolveSection ──────────────────────────────────────────────────────────

describe("resolveSection", () => {
  it("comfortable → 96", () => {
    expect(resolveSection("comfortable")).toBe(96);
  });
  it("compact → 80", () => {
    expect(resolveSection("compact")).toBe(80);
  });
  it("dense → 64", () => {
    expect(resolveSection("dense")).toBe(64);
  });
});

// ─── countEmittedTokens ──────────────────────────────────────────────────────

describe("countEmittedTokens — proposal §7", () => {
  it("returns 20 for default output (12 scale + 8 aliases)", () => {
    const tokens = generateSpacingCategory();
    expect(countEmittedTokens(tokens)).toBe(20);
  });

  it("returns 20 regardless of density (alias count constant)", () => {
    expect(countEmittedTokens(generateSpacingCategory({ density: "compact" }))).toBe(20);
    expect(countEmittedTokens(generateSpacingCategory({ density: "dense" }))).toBe(20);
  });
});

// ─── Output is in SCALE ──────────────────────────────────────────────────────

describe("invariant: every emitted alias value is in SCALE", () => {
  it.each(["comfortable", "compact", "dense"] as const)(
    "density=%s — all alias values present in SCALE",
    (density) => {
      const tokens = generateSpacingCategory({ density });
      for (const [name, value] of Object.entries(tokens.aliases)) {
        expect(SCALE, `alias ${name}=${value} not in SCALE`).toContain(value);
      }
    },
  );
});
