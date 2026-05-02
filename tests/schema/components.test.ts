import { describe, it, expect } from "vitest";
import {
  PRIMITIVE_NAMES,
  BUTTON_VARIANTS, INPUT_VARIANTS, CARD_VARIANTS, BADGE_VARIANTS, TAB_VARIANTS, AVATAR_VARIANTS,
  BUTTON_STATES, INPUT_STATES, TAB_STATES,
  BUTTON_SIZES, INPUT_SIZES, CARD_SIZES, BADGE_SIZES, TAB_SIZES, AVATAR_SIZES,
  BUTTON_SIZE_SPECS, INPUT_SIZE_SPECS, CARD_SIZE_SPECS, BADGE_SIZE_SPECS, TAB_SIZE_SPECS, AVATAR_SIZE_SPECS,
  CARD_SURFACE_OPTIONS, BUTTON_SHAPE_OPTIONS,
  DEFAULT_COMPONENT_KNOBS,
} from "../../src/schema/components.js";

describe("component primitives", () => {
  it("declares the 6 v1 primitives in stable order", () => {
    expect(PRIMITIVE_NAMES).toEqual(["button", "input", "card", "badge", "tab", "avatar"]);
  });
});

describe("variant taxonomies", () => {
  it("button variants cover proposal §3.1 (drops tertiary, danger)", () => {
    expect(BUTTON_VARIANTS).toEqual(["primary", "secondary", "ghost", "outline", "text", "icon"]);
  });
  it("input variants cover text/search/textarea (proposal §3.3)", () => {
    expect(INPUT_VARIANTS).toEqual(["text", "search", "textarea"]);
  });
  it("card variants cover default/outlined/elevated/filled (proposal §3.2)", () => {
    expect(CARD_VARIANTS).toEqual(["default", "outlined", "elevated", "filled"]);
  });
  it("badge variants cover subtle/solid (drops outline, n=1)", () => {
    expect(BADGE_VARIANTS).toEqual(["subtle", "solid"]);
  });
  it("tab variants cover underline/pill (drops segmented, n=3)", () => {
    expect(TAB_VARIANTS).toEqual(["underline", "pill"]);
  });
  it("avatar declares only circle (corpus too thin for more)", () => {
    expect(AVATAR_VARIANTS).toEqual(["circle"]);
  });
});

describe("state taxonomies", () => {
  it("buttons have 5 states ending with focus", () => {
    expect(BUTTON_STATES).toEqual(["default", "hover", "active", "disabled", "focus"]);
  });
  it("inputs have hover/focus/disabled/error", () => {
    expect(INPUT_STATES).toEqual(["default", "hover", "focus", "disabled", "error"]);
  });
  it("tabs have default/active/disabled (no hover — corpus shows none)", () => {
    expect(TAB_STATES).toEqual(["default", "active", "disabled"]);
  });
});

describe("size taxonomies", () => {
  it("buttons/inputs/cards have sm/md/lg", () => {
    for (const sizes of [BUTTON_SIZES, INPUT_SIZES, CARD_SIZES]) {
      expect(sizes).toEqual(["sm", "md", "lg"]);
    }
  });
  it("badges/tabs have sm/md only", () => {
    expect(BADGE_SIZES).toEqual(["sm", "md"]);
    expect(TAB_SIZES).toEqual(["sm", "md"]);
  });
  it("avatar has 5 sizes from convention", () => {
    expect(AVATAR_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
  });
});

describe("size spec maps", () => {
  it("every size has a spec for every primitive", () => {
    for (const s of BUTTON_SIZES) expect(BUTTON_SIZE_SPECS[s]).toBeDefined();
    for (const s of INPUT_SIZES)  expect(INPUT_SIZE_SPECS[s]).toBeDefined();
    for (const s of CARD_SIZES)   expect(CARD_SIZE_SPECS[s]).toBeDefined();
    for (const s of BADGE_SIZES)  expect(BADGE_SIZE_SPECS[s]).toBeDefined();
    for (const s of TAB_SIZES)    expect(TAB_SIZE_SPECS[s]).toBeDefined();
    for (const s of AVATAR_SIZES) expect(AVATAR_SIZE_SPECS[s]).toBeDefined();
  });

  it("every leaf value is a token-ref string with a category prefix", () => {
    const refRe = /^(spacing|radius|typography|elevation)\.[a-z][\w-]*$/;
    const allLeaves: string[] = [];
    for (const spec of Object.values(BUTTON_SIZE_SPECS)) allLeaves.push(...Object.values(spec));
    for (const spec of Object.values(INPUT_SIZE_SPECS))  allLeaves.push(...Object.values(spec));
    for (const spec of Object.values(CARD_SIZE_SPECS))   allLeaves.push(...Object.values(spec));
    for (const spec of Object.values(BADGE_SIZE_SPECS))  allLeaves.push(...Object.values(spec));
    for (const spec of Object.values(TAB_SIZE_SPECS))    allLeaves.push(...Object.values(spec));
    for (const spec of Object.values(AVATAR_SIZE_SPECS)) allLeaves.push(...Object.values(spec));
    for (const v of allLeaves) {
      expect(v, `leaf "${v}" should be a category-prefixed token ref`).toMatch(refRe);
    }
  });

  it("button radius is the same value across sizes (proposal §3.1: universal)", () => {
    const radii = Object.values(BUTTON_SIZE_SPECS).map((s) => s.radius);
    expect(new Set(radii).size).toBe(1);
  });

  it("card radius is the same value across sizes", () => {
    const radii = Object.values(CARD_SIZE_SPECS).map((s) => s.radius);
    expect(new Set(radii).size).toBe(1);
  });

  it("button md/lg share height (matches legacy, corpus mode 40-48px band)", () => {
    expect(BUTTON_SIZE_SPECS.md.height).toBe(BUTTON_SIZE_SPECS.lg.height);
  });

  it("card lg uses elevation.floating, sm/md use elevation.raised", () => {
    expect(CARD_SIZE_SPECS.sm.elevatedShadow).toBe("elevation.raised");
    expect(CARD_SIZE_SPECS.md.elevatedShadow).toBe("elevation.raised");
    expect(CARD_SIZE_SPECS.lg.elevatedShadow).toBe("elevation.floating");
  });

  it("avatar dimensions follow ascending spacing aliases", () => {
    expect(AVATAR_SIZE_SPECS.xs.dimension).toBe("spacing.md");
    expect(AVATAR_SIZE_SPECS.xl.dimension).toBe("spacing.section");
  });

  it("badge size spec omits radius (knob-resolved at generation time)", () => {
    for (const spec of Object.values(BADGE_SIZE_SPECS)) {
      expect("radius" in spec).toBe(false);
    }
  });
});

describe("knobs", () => {
  it("declares cardSurface options", () => {
    expect(CARD_SURFACE_OPTIONS).toEqual(["outlined", "elevated", "filled"]);
  });
  it("declares buttonShape options", () => {
    expect(BUTTON_SHAPE_OPTIONS).toEqual(["rect", "pill"]);
  });
  it("defaults are outlined cards on rectangular buttons (proposal §5)", () => {
    expect(DEFAULT_COMPONENT_KNOBS).toEqual({ cardSurface: "outlined", buttonShape: "rect" });
  });
});
