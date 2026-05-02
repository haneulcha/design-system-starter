import { describe, it, expect } from "vitest";
import {
  generateComponentCategory,
  resolveKnobs,
  buildButtonRadius,
  buildBadgeRadius,
  buildPhilosophy,
  countEmittedRefs,
} from "../../src/generator/components-category.js";
import { DEFAULT_COMPONENT_KNOBS } from "../../src/schema/components.js";

describe("resolveKnobs", () => {
  it("returns defaults when input is undefined", () => {
    expect(resolveKnobs(undefined)).toEqual(DEFAULT_COMPONENT_KNOBS);
  });
  it("respects valid user input", () => {
    expect(resolveKnobs({ cardSurface: "elevated", buttonShape: "pill" })).toEqual({
      cardSurface: "elevated",
      buttonShape: "pill",
    });
  });
  it("falls back to default for unknown values", () => {
    const k = resolveKnobs({ cardSurface: "weird" as never, buttonShape: "round" as never });
    expect(k).toEqual(DEFAULT_COMPONENT_KNOBS);
  });
});

describe("knob-driven helpers", () => {
  it("buildButtonRadius returns radius.pill on pill shape", () => {
    expect(buildButtonRadius("pill")).toBe("radius.pill");
    expect(buildButtonRadius("rect")).toBe("radius.button");
  });
  it("buildBadgeRadius follows the same shape rule (proposal §5 correlation)", () => {
    expect(buildBadgeRadius("pill")).toBe("radius.pill");
    expect(buildBadgeRadius("rect")).toBe("radius.subtle");
  });
  it("buildPhilosophy describes the chosen knob combo", () => {
    expect(buildPhilosophy({ cardSurface: "outlined", buttonShape: "rect" }))
      .toBe("Outlined cards on rectangular buttons.");
    expect(buildPhilosophy({ cardSurface: "elevated", buttonShape: "pill" }))
      .toBe("Elevated cards on pill-shaped buttons.");
  });
});

describe("generateComponentCategory at defaults", () => {
  const tokens = generateComponentCategory();

  it("emits all 6 primitives", () => {
    expect(Object.keys(tokens).filter((k) => !["knobs", "philosophy"].includes(k))).toEqual([
      "button", "input", "card", "badge", "tab", "avatar",
    ]);
  });

  it("button radius default is radius.button (rect shape)", () => {
    for (const sz of ["sm", "md", "lg"] as const) {
      expect(tokens.button.sizes[sz].radius).toBe("radius.button");
    }
  });

  it("badge radius default is radius.subtle (rect shape)", () => {
    expect(tokens.badge.sizes.sm.radius).toBe("radius.subtle");
    expect(tokens.badge.sizes.md.radius).toBe("radius.subtle");
  });

  it("card defaultVariant is outlined", () => {
    expect(tokens.card.defaultVariant).toBe("outlined");
  });

  it("avatar radius is radius.circle", () => {
    expect(tokens.avatar.radius).toBe("radius.circle");
  });

  it("cards and badges and avatars have empty states arrays", () => {
    expect(tokens.card.states).toEqual([]);
    expect(tokens.badge.states).toEqual([]);
    expect(tokens.avatar.states).toEqual([]);
  });

  it("philosophy at defaults names outlined + rectangular", () => {
    expect(tokens.philosophy).toBe("Outlined cards on rectangular buttons.");
  });

  it("knobs are echoed back", () => {
    expect(tokens.knobs).toEqual(DEFAULT_COMPONENT_KNOBS);
  });
});

describe("knob effects", () => {
  it("buttonShape:pill flips both button and badge radius to pill", () => {
    const t = generateComponentCategory({ buttonShape: "pill" });
    expect(t.button.sizes.md.radius).toBe("radius.pill");
    expect(t.badge.sizes.sm.radius).toBe("radius.pill");
  });
  it("cardSurface knob changes default variant only (variants list unchanged)", () => {
    const t = generateComponentCategory({ cardSurface: "filled" });
    expect(t.card.defaultVariant).toBe("filled");
    expect(t.card.variants).toEqual(["default", "outlined", "elevated", "filled"]);
  });
});

describe("countEmittedRefs", () => {
  it("matches the proposal §7 leaf-count expectation (~80)", () => {
    const t = generateComponentCategory();
    const n = countEmittedRefs(t);
    // 3 button sizes × 6 fields = 18
    // 3 input  sizes × 6 fields = 18
    // 3 card   sizes × 6 fields = 18
    // 2 badge  sizes × 4 fields = 8
    // 2 tab    sizes × 4 fields = 8
    // 5 avatar sizes × 1 field  = 5
    // + 1 avatar.radius
    // = 76
    expect(n).toBe(76);
  });
});
