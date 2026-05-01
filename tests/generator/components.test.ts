import { describe, it, expect } from "vitest";
import { generateComponents } from "../../src/generator/components.js";
import { getArchetype } from "../../src/schema/archetypes.js";

describe("generateComponents", () => {
  const archetype = getArchetype("professional");
  const specs = generateComponents(archetype);

  describe("button", () => {
    it("has 3 sizes", () => {
      expect(Object.keys(specs.button.sizes)).toEqual(["sm", "md", "lg"]);
    });

    it("all size values are token references", () => {
      for (const [, size] of Object.entries(specs.button.sizes)) {
        expect(size.height).toMatch(/^spacing\./);
        expect(size.paddingX).toMatch(/^spacing\./);
        expect(size.gap).toMatch(/^spacing\./);
        expect(size.fontSize).toMatch(/^typography\./);
        expect(size.iconSize).toMatch(/^spacing\./);
        expect(size.radius).toMatch(/^radius\./);
      }
    });

    it("has 3 variants", () => {
      expect(specs.button.variants).toEqual(["primary", "secondary", "ghost"]);
    });
  });

  describe("input", () => {
    it("dimensions are token references", () => {
      expect(specs.input.fieldHeight).toMatch(/^spacing\./);
      expect(specs.input.fieldRadius).toMatch(/^radius\./);
      expect(specs.input.labelFont).toMatch(/^typography\./);
      expect(specs.input.valueFont).toMatch(/^typography\./);
      expect(specs.input.helperFont).toMatch(/^typography\./);
    });

    it("has 4 states", () => {
      expect(specs.input.states).toEqual(["default", "focus", "error", "disabled"]);
    });
  });

  describe("card", () => {
    it("dimensions are token references", () => {
      expect(specs.card.radius).toMatch(/^radius\./);
      expect(specs.card.contentPadding).toMatch(/^spacing\./);
      expect(specs.card.contentGap).toMatch(/^spacing\./);
      expect(specs.card.shadow).toMatch(/^elevation\./);
      expect(specs.card.headerFont).toMatch(/^typography\./);
      expect(specs.card.bodyFont).toMatch(/^typography\./);
    });

    it("has 2 variants", () => {
      expect(specs.card.variants).toEqual(["default", "compact"]);
    });
  });

  describe("badge", () => {
    it("has sm and md sizes", () => {
      expect(Object.keys(specs.badge.sizes)).toEqual(["sm", "md"]);
    });

    it("all size values are token references", () => {
      for (const [, size] of Object.entries(specs.badge.sizes)) {
        expect(size.height).toMatch(/^spacing\./);
        expect(size.paddingX).toMatch(/^spacing\./);
        expect(size.radius).toMatch(/^radius\./);
        expect(size.font).toMatch(/^typography\./);
      }
    });

    it("has 5 color variants", () => {
      expect(specs.badge.variants).toEqual(["default", "success", "error", "warning", "info"]);
    });
  });

  describe("divider", () => {
    it("dimensions are token references", () => {
      expect(specs.divider.lineHeight).toMatch(/^spacing\./);
      expect(specs.divider.labelPaddingX).toMatch(/^spacing\./);
      expect(specs.divider.labelFont).toMatch(/^typography\./);
    });
  });
});
