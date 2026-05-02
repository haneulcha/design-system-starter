import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";
import { ARCHETYPES } from "../../src/schema/archetypes.js";
import type { ArchetypePreset } from "../../src/schema/types.js";

// Mood is no longer a user input but the 5 archetype presets remain as the
// internal driver for typography/components/layout/elevation. Iterate over
// them via the second `archetype` arg to verify each preset still produces a
// complete, well-formed design system.
const ALL_ARCHETYPES: ArchetypePreset[] = Object.values(ARCHETYPES);

for (const archetype of ALL_ARCHETYPES) {
  describe(`generate (archetype: ${archetype.mood})`, () => {
    const result = generate(
      {
        brandName: "TestBrand",
        brandColor: "#5e6ad2",
        fontFamily: "Inter",
      },
      archetype,
    );

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

    it("tokens.primitive.colors has the new color category roles", () => {
      const colors = result.tokens.primitive.colors;
      expect(colors).toHaveProperty("neutral");
      expect(colors).toHaveProperty("accent");
      expect(colors).toHaveProperty("error");
      expect(colors).toHaveProperty("success");
      expect(colors).toHaveProperty("warning");
    });

    it("neutral has 9 stops including the alias-referenced 50", () => {
      const neutral = result.tokens.primitive.colors.neutral;
      expect(Object.keys(neutral)).toHaveLength(9);
      expect(neutral).toHaveProperty("50");
      expect(neutral).toHaveProperty("900");
    });

    it("accent has 5 stops including contrast", () => {
      const accent = result.tokens.primitive.colors.accent;
      expect(Object.keys(accent)).toHaveLength(5);
      expect(accent).toHaveProperty("500");
      expect(accent).toHaveProperty("contrast");
    });

    it("each step has light and dark Oklch", () => {
      for (const [hue, scale] of Object.entries(result.tokens.primitive.colors)) {
        for (const [step, value] of Object.entries(scale)) {
          expect(value.light, `${hue}-${step}.light`).toHaveProperty("l");
          expect(value.dark, `${hue}-${step}.dark`).toHaveProperty("l");
        }
      }
    });

    it("tokens.semantic values are all {hue}-{step} format", () => {
      const pattern = /^[a-z0-9]+-[a-z0-9]+$/;
      for (const [role, value] of Object.entries(result.tokens.semantic)) {
        expect(value, `semantic["${role}"] = "${value}" not {hue}-{step}`).toMatch(pattern);
      }
    });

    it("tokens.semantic referenced hues all exist in primitive.colors", () => {
      const primitiveHues = new Set(Object.keys(result.tokens.primitive.colors));
      for (const [role, ref] of Object.entries(result.tokens.semantic)) {
        const lastDash = ref.lastIndexOf("-");
        const hue = ref.slice(0, lastDash);
        expect(
          primitiveHues.has(hue),
          `semantic["${role}"] = "${ref}" — hue "${hue}" not in primitive`,
        ).toBe(true);
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

    it("system has 5 components", () => {
      const c = result.system.components;
      expect(c.button.sizes).toBeTruthy();
      expect(c.button.variants).toHaveLength(3);
      expect(c.input.states).toHaveLength(4);
      expect(c.card.variants).toHaveLength(2);
      expect(c.badge.variants).toHaveLength(5);
      expect(c.divider.labelFont).toMatch(/^typography\./);
    });

    it("brand object has no mood field", () => {
      expect(result.tokens.brand).not.toHaveProperty("mood");
    });
  });
}
