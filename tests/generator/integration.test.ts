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

    it("tokens have light colors", () => {
      expect(result.tokens.color.light["brand-primary"]).toBeTruthy();
    });

    it("tokens have dark colors", () => {
      expect(result.tokens.color.dark["dark-background"]).toBeTruthy();
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
  });
}
