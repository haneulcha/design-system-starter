import { describe, it, expect } from "vitest";
import { generatePalette } from "../../src/generator/color.js";

describe("generatePalette", () => {
  it("generates correct structure from hex + neutral undertone", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    expect(p.primary).toHaveLength(3);
    expect(p.accent).toHaveLength(2);
    expect(p.neutral.length).toBeGreaterThanOrEqual(8);
    expect(p.semantic).toHaveLength(4);
    expect(p.surface.length).toBeGreaterThanOrEqual(3);
    expect(p.border.length).toBeGreaterThanOrEqual(2);
    expect(p.dark.surface.length).toBeGreaterThanOrEqual(3);
    expect(p.dark.text.length).toBeGreaterThanOrEqual(2);
    expect(p.dark.border.length).toBeGreaterThanOrEqual(2);
  });

  it("all hex values are valid 6-digit hex", () => {
    const p = generatePalette("#c96442", "warm");
    const all = [
      ...p.primary, ...p.accent, ...p.neutral, ...p.semantic,
      ...p.surface, ...p.border, ...p.dark.surface, ...p.dark.text,
    ];
    for (const c of all) {
      expect(c.hex, `${c.name} has invalid hex: ${c.hex}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("warm undertone neutrals mention warm", () => {
    const p = generatePalette("#c96442", "warm");
    expect(p.neutral.some((c) => c.description.toLowerCase().includes("warm"))).toBe(true);
  });

  it("cool undertone neutrals mention cool", () => {
    const p = generatePalette("#0a72ef", "cool");
    expect(p.neutral.some((c) => c.description.toLowerCase().includes("cool"))).toBe(true);
  });

  it("accent differs from primary", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    expect(p.accent[0].hex).not.toBe(p.primary[0].hex);
  });

  it("semantic has success, error, warning, info", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    const names = p.semantic.map((c) => c.name);
    expect(names).toContain("Success Green");
    expect(names).toContain("Error Red");
    expect(names).toContain("Warning Amber");
    expect(names).toContain("Info Blue");
  });
});
