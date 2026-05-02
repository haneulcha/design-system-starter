// tests/generator/typography-category.test.ts
//
// Validates the typography-category generator produces the contract described in
// docs/research/type-category-proposal.md.

import { describe, it, expect } from "vitest";
import {
  generateTypographyCategory,
  countEmittedTokens,
  resolveKnobs,
  buildFontChain,
  applyHeadingStyle,
} from "../../src/generator/typography-category.js";
import {
  CATEGORY_PROFILES,
  FONT_FAMILY_CHAINS,
  DEFAULT_TYPOGRAPHY_KNOBS,
} from "../../src/schema/typography.js";

// ─── Defaults shape — proposal §7 ───────────────────────────────────────────

describe("generateTypographyCategory @ all defaults — proposal §7", () => {
  const tokens = generateTypographyCategory();

  it("returns exactly 20 profiles", () => {
    expect(Object.keys(tokens.profiles)).toHaveLength(20);
  });

  it("all profiles have the 5 required fields populated (no nulls)", () => {
    for (const [key, token] of Object.entries(tokens.profiles)) {
      expect(token.fontFamily, `${key}.fontFamily`).toBeTruthy();
      expect(typeof token.size, `${key}.size`).toBe("number");
      expect(token.size, `${key}.size > 0`).toBeGreaterThan(0);
      expect(typeof token.weight, `${key}.weight`).toBe("number");
      expect(token.weight, `${key}.weight > 0`).toBeGreaterThan(0);
      expect(typeof token.lineHeight, `${key}.lineHeight`).toBe("number");
      expect(token.lineHeight, `${key}.lineHeight > 0`).toBeGreaterThan(0);
      expect(typeof token.letterSpacing, `${key}.letterSpacing`).toBe("string");
    }
  });

  it("exposes fontChains for all three slots", () => {
    expect(tokens.fontChains).toHaveProperty("sans");
    expect(tokens.fontChains).toHaveProperty("mono");
    expect(tokens.fontChains).toHaveProperty("serif");
  });
});

// ─── Profile invariants ──────────────────────────────────────────────────────

describe("profile invariants (post-generation values match schema defaults)", () => {
  const tokens = generateTypographyCategory();

  it("body.md.fontFamily includes Inter and Pretendard", () => {
    const ff = tokens.profiles["body.md"].fontFamily;
    expect(ff).toContain("Inter");
    expect(ff).toContain("Pretendard");
  });

  it("code.md.fontFamily includes Geist Mono and D2Coding", () => {
    const ff = tokens.profiles["code.md"].fontFamily;
    expect(ff).toContain("Geist Mono");
    expect(ff).toContain("D2Coding");
  });

  it("heading.xl has size=64, weight=500, letterSpacing=-0.02em", () => {
    const t = tokens.profiles["heading.xl"];
    expect(t.size).toBe(64);
    expect(t.weight).toBe(500);
    expect(t.letterSpacing).toBe("-0.02em");
  });

  it("badge.letterSpacing === '0.05em'", () => {
    expect(tokens.profiles["badge"].letterSpacing).toBe("0.05em");
  });
});

// ─── headingStyle knob ───────────────────────────────────────────────────────

describe("headingStyle='flat' — all heading.* get weight 400", () => {
  const tokens = generateTypographyCategory({ headingStyle: "flat" });
  const headingKeys = ["heading.xs", "heading.sm", "heading.md", "heading.lg", "heading.xl"];
  const nonHeadingKeys = ["body.md", "code.md", "badge", "card", "nav"];

  it.each(headingKeys)("%s.weight === 400", (key) => {
    expect(tokens.profiles[key].weight).toBe(400);
  });

  it.each(nonHeadingKeys)("%s is unchanged (not heading)", (key) => {
    expect(tokens.profiles[key].weight).toBe(CATEGORY_PROFILES[key].weight);
  });
});

describe("headingStyle='bold' — all heading.* get weight 700", () => {
  const tokens = generateTypographyCategory({ headingStyle: "bold" });
  const headingKeys = ["heading.xs", "heading.sm", "heading.md", "heading.lg", "heading.xl"];
  const nonHeadingKeys = ["body.md", "code.md", "badge", "card", "nav"];

  it.each(headingKeys)("%s.weight === 700", (key) => {
    expect(tokens.profiles[key].weight).toBe(700);
  });

  it.each(nonHeadingKeys)("%s is unchanged (not heading)", (key) => {
    expect(tokens.profiles[key].weight).toBe(CATEGORY_PROFILES[key].weight);
  });
});

describe("headingStyle='default' — matches schema CATEGORY_PROFILES weights", () => {
  const tokens = generateTypographyCategory({ headingStyle: "default" });
  const headingKeys = ["heading.xs", "heading.sm", "heading.md", "heading.lg", "heading.xl"];

  it.each(headingKeys)("%s.weight matches schema", (key) => {
    expect(tokens.profiles[key].weight).toBe(CATEGORY_PROFILES[key].weight);
  });
});

// ─── fontFamily override knobs ───────────────────────────────────────────────

describe("fontFamily.sans override", () => {
  it("body.md.fontFamily starts with custom font (quoted) when override has spaces", () => {
    const tokens = generateTypographyCategory({ fontFamily: { sans: "Mona Sans" } });
    // "Mona Sans" has a space → gets CSS-quoted per spec quoting rule
    expect(tokens.profiles["body.md"].fontFamily).toMatch(/^"Mona Sans",\s/);
  });

  it("full sans chain: override prepended to default Inter chain", () => {
    const tokens = generateTypographyCategory({ fontFamily: { sans: "Mona Sans" } });
    const ff = tokens.profiles["body.md"].fontFamily;
    expect(ff).toContain("Mona Sans");
    expect(ff).toContain("Inter");
    expect(ff).toContain("Pretendard");
  });

  it("setting sans does NOT change code.md (which uses mono slot)", () => {
    const defaultTokens = generateTypographyCategory();
    const overriddenTokens = generateTypographyCategory({ fontFamily: { sans: "Mona Sans" } });
    expect(overriddenTokens.profiles["code.md"].fontFamily).toBe(
      defaultTokens.profiles["code.md"].fontFamily
    );
  });
});

describe("fontFamily.mono override", () => {
  it("code.md.fontFamily starts with custom font (quoted) when override has spaces", () => {
    const tokens = generateTypographyCategory({ fontFamily: { mono: "Berkeley Mono" } });
    // "Berkeley Mono" has a space → gets CSS-quoted per spec quoting rule
    expect(tokens.profiles["code.md"].fontFamily).toMatch(/^"Berkeley Mono",\s/);
  });

  it("setting mono does NOT change body.md (which uses sans slot)", () => {
    const defaultTokens = generateTypographyCategory();
    const overriddenTokens = generateTypographyCategory({ fontFamily: { mono: "Berkeley Mono" } });
    expect(overriddenTokens.profiles["body.md"].fontFamily).toBe(
      defaultTokens.profiles["body.md"].fontFamily
    );
  });
});

describe("fontFamily override quoting", () => {
  it("multi-word font name is wrapped in double quotes", () => {
    const tokens = generateTypographyCategory({ fontFamily: { sans: "GT Walsheim Pro" } });
    expect(tokens.profiles["body.md"].fontFamily).toMatch(/^"GT Walsheim Pro",\s/);
  });

  it("single-word font name is NOT quoted", () => {
    const tokens = generateTypographyCategory({ fontFamily: { sans: "Mona" } });
    expect(tokens.profiles["body.md"].fontFamily).not.toMatch(/^"/);
    expect(tokens.profiles["body.md"].fontFamily).toMatch(/^Mona,\s/);
  });
});

// ─── resolveKnobs ─────────────────────────────────────────────────────────────

describe("resolveKnobs", () => {
  it("undefined input → all defaults", () => {
    const knobs = resolveKnobs(undefined);
    expect(knobs).toEqual(DEFAULT_TYPOGRAPHY_KNOBS);
  });

  it("empty object input → all defaults", () => {
    const knobs = resolveKnobs({});
    expect(knobs).toEqual(DEFAULT_TYPOGRAPHY_KNOBS);
  });

  it("partial input: only headingStyle set", () => {
    const knobs = resolveKnobs({ headingStyle: "flat" });
    expect(knobs.headingStyle).toBe("flat");
    expect(knobs.fontFamily.sans).toBeNull();
    expect(knobs.fontFamily.mono).toBeNull();
  });

  it("partial input: only fontFamily.sans set", () => {
    const knobs = resolveKnobs({ fontFamily: { sans: "Söhne" } });
    expect(knobs.fontFamily.sans).toBe("Söhne");
    expect(knobs.fontFamily.mono).toBeNull();
    expect(knobs.headingStyle).toBe("default");
  });

  it("empty-string sans → null", () => {
    const knobs = resolveKnobs({ fontFamily: { sans: "" } });
    expect(knobs.fontFamily.sans).toBeNull();
  });

  it("whitespace-only sans → null", () => {
    const knobs = resolveKnobs({ fontFamily: { sans: "   " } });
    expect(knobs.fontFamily.sans).toBeNull();
  });

  it("invalid headingStyle string → falls back to 'default'", () => {
    const knobs = resolveKnobs({ headingStyle: "heavy" as any });
    expect(knobs.headingStyle).toBe("default");
  });
});

// ─── buildFontChain ──────────────────────────────────────────────────────────

describe("buildFontChain", () => {
  it("override=null → returns base chain unchanged", () => {
    const chain = buildFontChain("sans", null, FONT_FAMILY_CHAINS);
    expect(chain).toBe(FONT_FAMILY_CHAINS.sans);
  });

  it("single-word override → prepended unquoted", () => {
    const chain = buildFontChain("sans", "Mona", FONT_FAMILY_CHAINS);
    expect(chain).toBe(`Mona, ${FONT_FAMILY_CHAINS.sans}`);
  });

  it("multi-word override → prepended in double quotes", () => {
    const chain = buildFontChain("sans", "GT Walsheim Pro", FONT_FAMILY_CHAINS);
    expect(chain).toBe(`"GT Walsheim Pro", ${FONT_FAMILY_CHAINS.sans}`);
  });

  it("mono slot override with spaces → quoted and prepended to mono chain", () => {
    const chain = buildFontChain("mono", "Berkeley Mono", FONT_FAMILY_CHAINS);
    // "Berkeley Mono" has a space → CSS-quoted
    expect(chain).toBe(`"Berkeley Mono", ${FONT_FAMILY_CHAINS.mono}`);
  });

  it("serif slot override → applied to serif chain", () => {
    const chain = buildFontChain("serif", "Lora", FONT_FAMILY_CHAINS);
    expect(chain).toBe(`Lora, ${FONT_FAMILY_CHAINS.serif}`);
  });

  it("override already at front of chain → does NOT duplicate", () => {
    // Inter is already the first entry in FONT_FAMILY_CHAINS.sans
    const chain = buildFontChain("sans", "Inter", FONT_FAMILY_CHAINS);
    // Should not start with "Inter, Inter, ..."
    expect(chain).not.toMatch(/^Inter,\s*Inter/);
  });
});

// ─── applyHeadingStyle ───────────────────────────────────────────────────────

describe("applyHeadingStyle", () => {
  const headingProfile = { ...CATEGORY_PROFILES["heading.xl"] };
  const bodyProfile = { ...CATEGORY_PROFILES["body.md"] };

  it("'default' style → returns profile unchanged", () => {
    const result = applyHeadingStyle(headingProfile, "heading.xl", "default");
    expect(result).toEqual(headingProfile);
  });

  it("'flat' on a heading.* profile → weight becomes 400", () => {
    const result = applyHeadingStyle(headingProfile, "heading.xl", "flat");
    expect(result.weight).toBe(400);
  });

  it("'flat' on a non-heading profile → profile unchanged", () => {
    const result = applyHeadingStyle(bodyProfile, "body.md", "flat");
    expect(result).toEqual(bodyProfile);
  });

  it("'bold' on a heading.* profile → weight becomes 700", () => {
    const result = applyHeadingStyle(headingProfile, "heading.xl", "bold");
    expect(result.weight).toBe(700);
  });

  it("'bold' on a non-heading profile → profile unchanged", () => {
    const result = applyHeadingStyle(bodyProfile, "body.md", "bold");
    expect(result).toEqual(bodyProfile);
  });

  it("'flat' on 'card' (single-variant) → profile unchanged", () => {
    const cardProfile = { ...CATEGORY_PROFILES["card"] };
    const result = applyHeadingStyle(cardProfile, "card", "flat");
    expect(result).toEqual(cardProfile);
  });

  it("does not mutate the original profile", () => {
    const original = { ...CATEGORY_PROFILES["heading.lg"] };
    const originalWeight = original.weight;
    applyHeadingStyle(original, "heading.lg", "flat");
    // original should not be mutated — applyHeadingStyle returns a new object
    expect(original.weight).toBe(originalWeight);
  });
});

// ─── countEmittedTokens ──────────────────────────────────────────────────────

describe("countEmittedTokens — proposal §7", () => {
  it("returns 49 for default output (20 profiles + 29 Tier 1 tokens)", () => {
    const tokens = generateTypographyCategory();
    expect(countEmittedTokens(tokens)).toBe(49);
  });
});
