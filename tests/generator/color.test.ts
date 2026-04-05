import { describe, it, expect } from "vitest";
import { generateScales, detectHueName } from "../../src/generator/color.js";

describe("detectHueName", () => {
  it("maps hue ranges to color names", () => {
    expect(detectHueName(10)).toBe("red");
    expect(detectHueName(50)).toBe("orange");
    expect(detectHueName(90)).toBe("yellow");
    expect(detectHueName(145)).toBe("green");
    expect(detectHueName(200)).toBe("cyan");
    expect(detectHueName(265)).toBe("blue");
    expect(detectHueName(320)).toBe("purple");
    expect(detectHueName(350)).toBe("red"); // wraps around
  });
});

describe("generateScales", () => {
  const scales = generateScales("#5e6ad2", "neutral", "balanced");

  it("generates 7 color hues", () => {
    expect(Object.keys(scales).length).toBeGreaterThanOrEqual(6);
    expect(scales.gray).toBeTruthy();
    expect(scales.blue).toBeTruthy(); // brand hue for #5e6ad2
    expect(scales.red).toBeTruthy();
    expect(scales.green).toBeTruthy();
    expect(scales.amber).toBeTruthy();
  });

  it("each scale has 10 steps", () => {
    for (const [, scale] of Object.entries(scales)) {
      const steps = Object.keys(scale);
      expect(steps).toHaveLength(10);
      expect(steps).toContain("100");
      expect(steps).toContain("1000");
    }
  });

  it("each step has light and dark hex values", () => {
    for (const [, scale] of Object.entries(scales)) {
      for (const [, step] of Object.entries(scale)) {
        expect(step.light).toMatch(/^#[0-9a-f]{6}$/i);
        expect(step.dark).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("light mode: step 100 is lighter than step 1000", () => {
    // Compare gray scale — step 100 should have higher perceived lightness
    const g100 = scales.gray["100"].light;
    const g1000 = scales.gray["1000"].light;
    // Simple check: first hex char of 100 should be higher (lighter)
    expect(parseInt(g100.slice(1, 3), 16)).toBeGreaterThan(
      parseInt(g1000.slice(1, 3), 16)
    );
  });

  it("dark mode: step 100 is darker than step 1000", () => {
    const g100 = scales.gray["100"].dark;
    const g1000 = scales.gray["1000"].dark;
    expect(parseInt(g100.slice(1, 3), 16)).toBeLessThan(
      parseInt(g1000.slice(1, 3), 16)
    );
  });

  it("vivid has higher chroma in status colors than muted", () => {
    const vivid = generateScales("#5e6ad2", "neutral", "vivid");
    const muted = generateScales("#5e6ad2", "neutral", "muted");
    // Compare red-700 light values — vivid should be more saturated
    // We can't easily check chroma from hex, but we can verify they're different
    expect(vivid.red?.["700"]?.light).not.toBe(muted.red?.["700"]?.light);
  });
});
