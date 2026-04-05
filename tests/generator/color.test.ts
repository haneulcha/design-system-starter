import { describe, it, expect } from "vitest";
import {
  generateScales,
  parsePrimary,
  formatOklch,
  formatOklchAlpha,
  oklchToHex,
  toCssCustomProperties,
} from "../../src/generator/color.js";

describe("parsePrimary", () => {
  it("extracts oklch components from hex", () => {
    const color = parsePrimary("#5e6ad2");
    expect(color.l).toBeGreaterThan(0);
    expect(color.c).toBeGreaterThan(0);
    expect(color.h).toBeGreaterThan(0);
  });

  it("throws on invalid hex", () => {
    expect(() => parsePrimary("not-a-color")).toThrow("Invalid hex color");
  });
});

describe("generateScales", () => {
  const scales = generateScales("#5e6ad2");

  it("returns all 7 roles", () => {
    const roles = Object.keys(scales);
    expect(roles).toEqual(
      expect.arrayContaining(["brand", "accent", "green", "amber", "red", "blue", "gray"]),
    );
    expect(roles).toHaveLength(7);
  });

  it("each scale has 10 steps (100–1000)", () => {
    const expectedSteps = ["100", "200", "300", "400", "500", "600", "700", "800", "900", "1000"];
    for (const scale of Object.values(scales)) {
      expect(Object.keys(scale).sort((a, b) => +a - +b)).toEqual(expectedSteps);
    }
  });

  it("each step has light and dark oklch values", () => {
    for (const scale of Object.values(scales)) {
      for (const step of Object.values(scale)) {
        expect(step.light).toHaveProperty("l");
        expect(step.light).toHaveProperty("c");
        expect(step.light).toHaveProperty("h");
        expect(step.dark).toHaveProperty("l");
        expect(step.dark).toHaveProperty("c");
        expect(step.dark).toHaveProperty("h");
      }
    }
  });

  it("brand-700 has the default anchor lightness (0.45)", () => {
    expect(scales.brand["700"].light.l).toBe(0.45);
  });

  it("brand-700 has peak chroma (cMult 1.0)", () => {
    const primary = parsePrimary("#5e6ad2");
    expect(scales.brand["700"].light.c).toBeCloseTo(primary.c, 6);
  });

  it("preserves input hue across all brand steps", () => {
    const primary = parsePrimary("#5e6ad2");
    for (const step of Object.values(scales.brand)) {
      expect(step.light.h).toBeCloseTo(primary.h, 6);
    }
  });

  it("accepts custom brandAnchorL", () => {
    const custom = generateScales("#5e6ad2", { brandAnchorL: 0.50 });
    expect(custom.brand["700"].light.l).toBe(0.50);
  });

  it("accent hue is brand + 150°", () => {
    const primary = parsePrimary("#5e6ad2");
    const expectedH = (primary.h + 150) % 360;
    expect(scales.accent["700"].light.h).toBeCloseTo(expectedH, 6);
  });

  it("accent chroma is brand × 0.85 at peak", () => {
    const primary = parsePrimary("#5e6ad2");
    expect(scales.accent["700"].light.c).toBeCloseTo(primary.c * 0.85, 6);
  });

  it("semantic colors use fixed hues", () => {
    expect(scales.green["700"].light.h).toBe(142);
    expect(scales.amber["700"].light.h).toBe(85);
    expect(scales.red["700"].light.h).toBe(25);
    expect(scales.blue["700"].light.h).toBe(250);
  });

  it("semantic chroma derives from brand chroma at peak", () => {
    const primary = parsePrimary("#5e6ad2");
    expect(scales.green["700"].light.c).toBeCloseTo(primary.c * 0.90, 6);
    expect(scales.red["700"].light.c).toBeCloseTo(primary.c * 0.95, 6);
  });

  it("gray uses brand hue with low chroma", () => {
    const primary = parsePrimary("#5e6ad2");
    expect(scales.gray["500"].light.h).toBeCloseTo(primary.h, 6);
    expect(scales.gray["500"].light.c).toBe(0.012);
  });

  it("gray accepts custom chroma", () => {
    const custom = generateScales("#5e6ad2", { grayChroma: 0.02 });
    expect(custom.gray["500"].light.c).toBe(0.02);
  });

  it("dark mode is scale inversion: dark-100 = light-1000", () => {
    expect(scales.brand["100"].dark).toEqual(scales.brand["1000"].light);
    expect(scales.brand["200"].dark).toEqual(scales.brand["900"].light);
    expect(scales.brand["500"].dark).toEqual(scales.brand["600"].light);
  });

  it("light mode: step 100 is lighter than step 1000", () => {
    expect(scales.brand["100"].light.l).toBeGreaterThan(scales.brand["1000"].light.l);
    expect(scales.gray["100"].light.l).toBeGreaterThan(scales.gray["1000"].light.l);
  });
});

describe("formatOklch", () => {
  it("formats to oklch() CSS string", () => {
    expect(formatOklch({ l: 0.36, c: 0.18, h: 250 })).toBe("oklch(0.36 0.18 250)");
  });

  it("rounds to appropriate precision", () => {
    const result = formatOklch({ l: 0.36123456, c: 0.18765432, h: 250.456 });
    expect(result).toBe("oklch(0.3612 0.1877 250.46)");
  });
});

describe("toCssCustomProperties", () => {
  const scales = generateScales("#5e6ad2");
  const css = toCssCustomProperties(scales);

  it("contains :root and dark theme blocks", () => {
    expect(css).toContain(":root {");
    expect(css).toContain('[data-theme="dark"] {');
  });

  it("contains brand custom properties", () => {
    expect(css).toContain("--color-brand-700:");
    expect(css).toContain("--color-brand-100:");
  });

  it("contains all roles", () => {
    for (const role of ["brand", "accent", "green", "amber", "red", "blue", "gray"]) {
      expect(css).toContain(`--color-${role}-`);
    }
  });

  it("values are oklch() format", () => {
    expect(css).toMatch(/--color-brand-700:\s*oklch\(/);
  });
});

describe("formatOklchAlpha", () => {
  it("formats with alpha channel", () => {
    expect(formatOklchAlpha({ l: 0.36, c: 0.18, h: 250 }, 0.1)).toBe(
      "oklch(0.36 0.18 250 / 0.1)",
    );
  });

  it("rounds alpha to 3 digits", () => {
    expect(formatOklchAlpha({ l: 0.5, c: 0.1, h: 100 }, 0.09411)).toBe(
      "oklch(0.5 0.1 100 / 0.094)",
    );
  });
});

describe("oklchToHex", () => {
  it("converts oklch to 6-digit hex", () => {
    const hex = oklchToHex({ l: 0.5, c: 0.15, h: 250 });
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("black returns near-black hex", () => {
    const hex = oklchToHex({ l: 0, c: 0, h: 0 });
    expect(hex).toBe("#000000");
  });
});
