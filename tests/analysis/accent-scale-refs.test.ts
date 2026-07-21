import { describe, it, expect } from "vitest";
import {
  parseTailwindTheme,
  radixLightScales,
} from "../../scripts/analysis/accent-scale/extract-references.ts";

const SAMPLE_THEME = `
:root {
  --color-red-50: oklch(0.971 0.013 17.38);
  --color-red-500: oklch(0.637 0.237 25.331);
  --color-red-950: oklch(0.258 0.092 26.042);
  --color-slate-50: oklch(0.984 0.003 247.858);
  --color-slate-500: oklch(0.554 0.046 257.417);
  --color-slate-950: oklch(0.129 0.042 264.695);
  --color-black: #000;
  --spacing: 0.25rem;
}
`;

describe("parseTailwindTheme", () => {
  it("collects hue → stop → hex, ignoring non-scale vars", () => {
    const palettes = parseTailwindTheme(SAMPLE_THEME, ["50", "500", "950"]);
    expect(Object.keys(palettes)).toEqual(["red"]);
    expect(palettes.red).toHaveLength(3);
    // oklch(0.971 0.013 17.38) → 밝은 빨강 계열 hex
    expect(palettes.red[0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("drops hues missing any requested stop", () => {
    const palettes = parseTailwindTheme(SAMPLE_THEME, ["50", "100"]);
    expect(palettes).toEqual({});
  });

  it("excludes neutral families (e.g. slate) even when all requested stops are present", () => {
    const palettes = parseTailwindTheme(SAMPLE_THEME, ["50", "500", "950"]);
    expect(palettes).not.toHaveProperty("slate");
    expect(Object.keys(palettes)).toEqual(["red"]);
  });
});

describe("radixLightScales", () => {
  it("keeps only 12-step light scales (no Dark/A/P3, no gray family)", () => {
    const scales = radixLightScales();
    expect(scales.blue).toHaveLength(12);
    expect(scales).not.toHaveProperty("blueDark");
    expect(scales).not.toHaveProperty("blueA");
    expect(scales).not.toHaveProperty("slate");
    // 모두 hex 문자열
    expect(scales.blue.every((s: string) => /^#[0-9a-f]{6}$/i.test(s))).toBe(true);
  });
});
