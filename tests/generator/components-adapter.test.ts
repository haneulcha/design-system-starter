import { describe, it, expect } from "vitest";
import { generateComponentCategory } from "../../src/generator/components-category.js";
import { toLegacyComponentSpecs, generateComponents } from "../../src/generator/components.js";

describe("toLegacyComponentSpecs", () => {
  const tokens = generateComponentCategory();
  const legacy = toLegacyComponentSpecs(tokens);

  it("button sizes pass through unchanged", () => {
    expect(legacy.button.sizes.sm).toEqual(tokens.button.sizes.sm);
    expect(legacy.button.sizes.md).toEqual(tokens.button.sizes.md);
    expect(legacy.button.sizes.lg).toEqual(tokens.button.sizes.lg);
  });

  it("button preserves the legacy 3-variant list (primary/secondary/ghost)", () => {
    expect(legacy.button.variants).toEqual(["primary", "secondary", "ghost"]);
  });

  it("input flat fields are sourced from input.sizes.md", () => {
    const md = tokens.input.sizes.md;
    expect(legacy.input.fieldHeight).toBe(md.height);
    expect(legacy.input.fieldPaddingX).toBe(md.paddingX);
    expect(legacy.input.fieldRadius).toBe(md.radius);
    expect(legacy.input.labelFont).toBe(md.labelFont);
    expect(legacy.input.valueFont).toBe(md.valueFont);
    expect(legacy.input.helperFont).toBe(md.helperFont);
  });

  it("card flat fields are sourced from card.sizes.md", () => {
    const md = tokens.card.sizes.md;
    expect(legacy.card.radius).toBe(md.radius);
    expect(legacy.card.contentPadding).toBe(md.contentPadding);
    expect(legacy.card.contentGap).toBe(md.contentGap);
    expect(legacy.card.shadow).toBe(md.elevatedShadow);
    expect(legacy.card.headerFont).toBe(md.headerFont);
    expect(legacy.card.bodyFont).toBe(md.bodyFont);
  });

  it("badge sizes pass through; legacy color variants preserved", () => {
    expect(legacy.badge.sizes.sm).toEqual(tokens.badge.sizes.sm);
    expect(legacy.badge.variants).toEqual(["default", "success", "error", "warning", "info"]);
  });

  it("divider is a static minimal spec (1px hairline)", () => {
    expect(legacy.divider.lineHeight).toBe("1px");
    expect(legacy.divider.labelPaddingX).toBe("spacing.sm");
    expect(legacy.divider.labelFont).toBe("typography.caption-md");
  });
});

describe("generateComponents (backward-compat entry point)", () => {
  it("ignores the archetype argument", () => {
    const a = generateComponents();
    const b = generateComponents({ mood: "professional" } as never);
    expect(a).toEqual(b);
  });

  it("threads ComponentInput through to the new pipeline", () => {
    const piped = generateComponents(undefined, { buttonShape: "pill" });
    expect(piped.button.sizes.md.radius).toBe("radius.pill");
  });
});
