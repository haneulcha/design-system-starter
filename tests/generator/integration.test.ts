import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";
import type { MoodArchetype } from "../../src/schema/types.js";

const ALL_MOODS: MoodArchetype[] = [
  "clean-minimal",
  "warm-friendly",
  "bold-energetic",
  "professional",
  "playful-creative",
];

for (const mood of ALL_MOODS) {
  describe(`generate: ${mood}`, () => {
    const result = generate({
      brandName: "TestBrand",
      primaryColor: "#5e6ad2",
      mood,
      fontFamily: "Inter",
    });

    it("DESIGN.md has all 9 sections", () => {
      for (let i = 1; i <= 9; i++) {
        expect(result.designMd).toContain(`## ${i}.`);
      }
    });

    it("no unresolved template placeholders", () => {
      expect(result.designMd).not.toMatch(/\{\{[^}]+\}\}/);
    });

    it("brandName appears in heading", () => {
      expect(result.designMd).toContain("# Design System: TestBrand");
    });

    it("tokens.primitive.colors has hue-named keys", () => {
      const keys = Object.keys(result.tokens.primitive.colors);
      // Should have at least one key ending in a numeric scale value
      const hasScaleKey = keys.some((k) => /\d+$/.test(k));
      expect(hasScaleKey).toBe(true);
      expect(keys.length).toBeGreaterThanOrEqual(10);
    });

    it("tokens.semantic.light values are keys in primitive.colors", () => {
      const primitiveKeys = new Set(Object.keys(result.tokens.primitive.colors));
      for (const val of Object.values(result.tokens.semantic.light)) {
        expect(primitiveKeys.has(val)).toBe(true);
      }
    });

    it("tokens.semantic.dark values are keys in primitive.colors", () => {
      const primitiveKeys = new Set(Object.keys(result.tokens.primitive.colors));
      for (const val of Object.values(result.tokens.semantic.dark)) {
        expect(primitiveKeys.has(val)).toBe(true);
      }
    });

    it("tokens.component.button.primary exists", () => {
      expect(result.tokens.component.button).toBeTruthy();
      expect(result.tokens.component.button.primary).toBeTruthy();
      expect(result.tokens.component.button.primary.bg).toBeTruthy();
    });

    it("tokenFiles has 4 entries", () => {
      expect(Object.keys(result.tokenFiles)).toHaveLength(4);
      expect(result.tokenFiles["primitive.ts"]).toBeTruthy();
      expect(result.tokenFiles["semantic.ts"]).toBeTruthy();
      expect(result.tokenFiles["component.ts"]).toBeTruthy();
      expect(result.tokenFiles["index.ts"]).toBeTruthy();
    });

    it("tokens have 12+ typography styles", () => {
      expect(Object.keys(result.tokens.typography.styles).length).toBeGreaterThanOrEqual(12);
    });

    it("tokens have 8+ spacing values", () => {
      expect(Object.keys(result.tokens.spacing).length).toBeGreaterThanOrEqual(8);
    });

    it("tokens have elevation values", () => {
      expect(Object.keys(result.tokens.elevation).length).toBeGreaterThanOrEqual(3);
    });

    it("tokens have breakpoints", () => {
      expect(Object.keys(result.tokens.breakpoint).length).toBe(4);
    });

    it("system has 6 components", () => {
      const c = result.system.components;
      expect(c.button.sizes).toBeTruthy();
      expect(c.button.variants).toHaveLength(3);
      expect(c.input.states).toHaveLength(4);
      expect(c.card.variants).toHaveLength(2);
      expect(c.badge.variants).toHaveLength(5);
      expect(Object.keys(c.avatar.sizes)).toHaveLength(3);
      expect(c.divider.labelFont).toMatch(/^typography\./);
    });
  });
}
