// tests/generator/radius-category.test.ts
//
// Validates the radius-category generator produces the contract described in
// docs/research/radius-category-proposal.md.

import { describe, it, expect } from "vitest";
import {
  generateRadiusCategory,
  countEmittedTokens,
  resolveKnobs,
  resolveStyleProfile,
  resolveProfileValue,
} from "../../src/generator/radius-category.js";
import {
  DEFAULT_RADIUS_KNOBS,
  FIXED_TOKEN_VALUES,
  SCALE,
  SPECIAL,
  STYLE_PROFILES,
} from "../../src/schema/radius.js";

// ─── Defaults shape — proposal §7 ───────────────────────────────────────────

describe("generateRadiusCategory @ all defaults — proposal §7", () => {
  const r = generateRadiusCategory();

  it("returns the 8-stop SCALE unchanged", () => {
    expect([...r.scale]).toEqual([...SCALE]);
  });

  it("returns SPECIAL with pill + circle", () => {
    expect(r.special).toEqual(SPECIAL);
  });

  it("returns exactly 8 named tokens", () => {
    expect(Object.keys(r.tokens)).toHaveLength(8);
  });

  it("token names are exactly none/subtle/button/input/card/large/pill/circle", () => {
    expect(Object.keys(r.tokens).sort()).toEqual(
      ["button", "card", "circle", "input", "large", "none", "pill", "subtle"],
    );
  });

  it("default style: button=8, input=8, card=12", () => {
    expect(r.tokens.button).toBe(8);
    expect(r.tokens.input).toBe(8);
    expect(r.tokens.card).toBe(12);
  });

  it("fixed tokens: none=0, subtle=4, large=24", () => {
    expect(r.tokens.none).toBe(0);
    expect(r.tokens.subtle).toBe(4);
    expect(r.tokens.large).toBe(24);
  });

  it("special tokens: pill='9999px', circle='50%'", () => {
    expect(r.tokens.pill).toBe("9999px");
    expect(r.tokens.circle).toBe("50%");
  });

  it("knobs reflect resolved defaults", () => {
    expect(r.knobs).toEqual(DEFAULT_RADIUS_KNOBS);
  });
});

// ─── style knob — proposal §5 ───────────────────────────────────────────────

describe("style='sharp' → button=4, input=4, card=8", () => {
  const r = generateRadiusCategory({ style: "sharp" });

  it("variable tokens shift", () => {
    expect(r.tokens.button).toBe(4);
    expect(r.tokens.input).toBe(4);
    expect(r.tokens.card).toBe(8);
  });

  it("fixed tokens unchanged", () => {
    expect(r.tokens.none).toBe(0);
    expect(r.tokens.subtle).toBe(4);
    expect(r.tokens.large).toBe(24);
    expect(r.tokens.pill).toBe("9999px");
    expect(r.tokens.circle).toBe("50%");
  });

  it("knobs.style is 'sharp'", () => {
    expect(r.knobs.style).toBe("sharp");
  });
});

describe("style='generous' → button=12, input=8, card=16", () => {
  const r = generateRadiusCategory({ style: "generous" });

  it("button=12, input=8, card=16 (input deliberately decoupled)", () => {
    expect(r.tokens.button).toBe(12);
    expect(r.tokens.input).toBe(8);
    expect(r.tokens.card).toBe(16);
  });
});

describe("style='pill' → button='9999px', input='9999px', card=12", () => {
  const r = generateRadiusCategory({ style: "pill" });

  it("button + input resolve to SPECIAL.pill", () => {
    expect(r.tokens.button).toBe("9999px");
    expect(r.tokens.input).toBe("9999px");
  });

  it("card stays at 12 (matches the pill-friendly card mode in corpus)", () => {
    expect(r.tokens.card).toBe(12);
  });
});

describe("style='standard' → matches DEFAULT explicit", () => {
  it("identical to no-input default", () => {
    const a = generateRadiusCategory({ style: "standard" });
    const b = generateRadiusCategory();
    expect(a.tokens).toEqual(b.tokens);
  });
});

// ─── resolveKnobs ────────────────────────────────────────────────────────────

describe("resolveKnobs", () => {
  it("undefined → defaults", () => {
    expect(resolveKnobs(undefined)).toEqual(DEFAULT_RADIUS_KNOBS);
  });

  it("empty object → defaults", () => {
    expect(resolveKnobs({})).toEqual(DEFAULT_RADIUS_KNOBS);
  });

  it("explicit style honored", () => {
    expect(resolveKnobs({ style: "sharp" })).toEqual({ style: "sharp" });
  });

  it("invalid style → falls back to default 'standard'", () => {
    expect(resolveKnobs({ style: "extreme" as never })).toEqual(DEFAULT_RADIUS_KNOBS);
  });
});

// ─── resolveProfileValue + resolveStyleProfile ──────────────────────────────

describe("resolveProfileValue", () => {
  it("number passes through as number", () => {
    expect(resolveProfileValue(8)).toBe(8);
  });
  it("'pill' resolves to SPECIAL.pill", () => {
    expect(resolveProfileValue("pill")).toBe("9999px");
  });
});

describe("resolveStyleProfile", () => {
  it("standard returns numeric values", () => {
    expect(resolveStyleProfile("standard")).toEqual({ button: 8, input: 8, card: 12 });
  });

  it("pill returns string values for button/input", () => {
    expect(resolveStyleProfile("pill")).toEqual({ button: "9999px", input: "9999px", card: 12 });
  });
});

// ─── countEmittedTokens ──────────────────────────────────────────────────────

describe("countEmittedTokens — proposal §7", () => {
  it("returns 18 at default (8 scale + 2 special + 8 tokens)", () => {
    expect(countEmittedTokens(generateRadiusCategory())).toBe(18);
  });

  it("count is constant across all 4 styles", () => {
    for (const style of ["sharp", "standard", "generous", "pill"] as const) {
      expect(countEmittedTokens(generateRadiusCategory({ style }))).toBe(18);
    }
  });
});

// ─── Invariant: every numeric token is in SCALE ─────────────────────────────

describe("invariant: every numeric token value is in SCALE", () => {
  it.each(["sharp", "standard", "generous", "pill"] as const)(
    "style=%s — all numeric tokens present in SCALE",
    (style) => {
      const r = generateRadiusCategory({ style });
      for (const [name, value] of Object.entries(r.tokens)) {
        if (typeof value === "number") {
          expect(SCALE, `token ${name}=${value} not in SCALE`).toContain(value);
        }
      }
    },
  );
});

// ─── Cross-check with schema invariants ─────────────────────────────────────

describe("style profiles match STYLE_PROFILES schema", () => {
  it.each(["sharp", "standard", "generous", "pill"] as const)(
    "style=%s — profile values match",
    (style) => {
      const r = generateRadiusCategory({ style });
      const profile = STYLE_PROFILES[style];
      const expectedButton = profile.button === "pill" ? "9999px" : profile.button;
      const expectedInput = profile.input === "pill" ? "9999px" : profile.input;
      expect(r.tokens.button).toBe(expectedButton);
      expect(r.tokens.input).toBe(expectedInput);
      expect(r.tokens.card).toBe(profile.card);
    },
  );
});

// ─── FIXED_TOKEN_VALUES integration ─────────────────────────────────────────

describe("fixed tokens come from FIXED_TOKEN_VALUES across all styles", () => {
  it.each(["sharp", "standard", "generous", "pill"] as const)(
    "style=%s — none/subtle/large/pill/circle unchanged",
    (style) => {
      const r = generateRadiusCategory({ style });
      expect(r.tokens.none).toBe(FIXED_TOKEN_VALUES.none);
      expect(r.tokens.subtle).toBe(FIXED_TOKEN_VALUES.subtle);
      expect(r.tokens.large).toBe(FIXED_TOKEN_VALUES.large);
      expect(r.tokens.pill).toBe(FIXED_TOKEN_VALUES.pill);
      expect(r.tokens.circle).toBe(FIXED_TOKEN_VALUES.circle);
    },
  );
});
