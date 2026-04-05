// src/generator/color.ts

import { converter, parse, formatHex } from "culori";

const toOklch = converter("oklch");
import type { Oklch, ColorStep, ColorScales } from "../schema/types.js";

export type { ColorScales };

// ─── Configuration ───────────────────────────────────────────────────────────

export interface ColorConfig {
  /** brand-700 anchor lightness. Default 0.36 */
  readonly brandAnchorL: number;
  /** gray scale chroma. Default 0.012 */
  readonly grayChroma: number;
}

const DEFAULT_CONFIG: ColorConfig = {
  brandAnchorL: 0.36,
  grayChroma: 0.012,
};

// ─── Scale Definitions ───────────────────────────────────────────────────────

interface StepDef {
  readonly step: string;
  readonly l: number;
  readonly cMult: number;
}

const CHROMATIC_STEPS: readonly StepDef[] = [
  { step: "100",  l: 0.96, cMult: 0.15 },
  { step: "200",  l: 0.90, cMult: 0.25 },
  { step: "300",  l: 0.82, cMult: 0.40 },
  { step: "400",  l: 0.70, cMult: 0.60 },
  { step: "500",  l: 0.58, cMult: 0.80 },
  { step: "600",  l: 0.46, cMult: 0.92 },
  { step: "700",  l: 0.36, cMult: 1.00 },
  { step: "800",  l: 0.28, cMult: 0.95 },
  { step: "900",  l: 0.20, cMult: 0.75 },
  { step: "1000", l: 0.13, cMult: 0.55 },
];

const GRAY_STEPS: readonly { readonly step: string; readonly l: number }[] = [
  { step: "100",  l: 0.97 },
  { step: "200",  l: 0.93 },
  { step: "300",  l: 0.87 },
  { step: "400",  l: 0.76 },
  { step: "500",  l: 0.63 },
  { step: "600",  l: 0.50 },
  { step: "700",  l: 0.38 },
  { step: "800",  l: 0.27 },
  { step: "900",  l: 0.17 },
  { step: "1000", l: 0.10 },
];

const SEMANTIC_DEFS: Record<string, { readonly h: number; readonly cMult: number }> = {
  green: { h: 142, cMult: 0.90 },
  amber: { h: 85,  cMult: 0.85 },
  red:   { h: 25,  cMult: 0.95 },
  blue:  { h: 250, cMult: 0.90 },
};

const STEP_NUMBERS: readonly number[] = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

// ─── Pure Functions ──────────────────────────────────────────────────────────

export const parsePrimary = (hex: string): Oklch => {
  const color = toOklch(parse(hex)!);
  if (!color) throw new Error(`Invalid hex color: ${hex}`);
  return { l: color.l ?? 0, c: color.c ?? 0, h: color.h ?? 0 };
};

const DEFAULT_ANCHOR_L = 0.36;

const clampL = (l: number): number => Math.min(0.99, Math.max(0.01, l));

const buildChromaticScale = (
  baseC: number,
  h: number,
  anchorL: number = DEFAULT_ANCHOR_L,
): Record<string, Oklch> => {
  const offset = anchorL - DEFAULT_ANCHOR_L;
  return Object.fromEntries(
    CHROMATIC_STEPS.map(({ step, l, cMult }) => [
      step,
      { l: clampL(l + offset), c: baseC * cMult, h },
    ]),
  );
};

const buildGrayScale = (h: number, c: number): Record<string, Oklch> =>
  Object.fromEntries(
    GRAY_STEPS.map(({ step, l }) => [step, { l, c, h }]),
  );

const invertScale = (scale: Record<string, Oklch>): Record<string, Oklch> =>
  Object.fromEntries(
    STEP_NUMBERS.map((step) => [
      String(step),
      scale[String(1100 - step)],
    ]),
  );

const withDarkMode = (
  lightScales: Record<string, Record<string, Oklch>>,
): ColorScales =>
  Object.fromEntries(
    Object.entries(lightScales).map(([role, lightScale]) => {
      const darkScale = invertScale(lightScale);
      return [
        role,
        Object.fromEntries(
          Object.keys(lightScale).map((step): [string, ColorStep] => [
            step,
            { light: lightScale[step], dark: darkScale[step] },
          ]),
        ),
      ];
    }),
  );

// ─── Main Generator ──────────────────────────────────────────────────────────

export const generateScales = (
  primaryHex: string,
  config: Partial<ColorConfig> = {},
): ColorScales => {
  const { brandAnchorL, grayChroma } = { ...DEFAULT_CONFIG, ...config };

  const primary = parsePrimary(primaryHex);
  const brandC = primary.c;
  const brandH = primary.h;

  const lightScales: Record<string, Record<string, Oklch>> = {
    brand: buildChromaticScale(brandC, brandH, brandAnchorL),
    accent: buildChromaticScale(brandC * 0.85, (brandH + 150) % 360, brandAnchorL),
    ...Object.fromEntries(
      Object.entries(SEMANTIC_DEFS).map(([name, { h, cMult }]) => [
        name,
        buildChromaticScale(brandC * cMult, h, brandAnchorL),
      ]),
    ),
    gray: buildGrayScale(brandH, grayChroma),
  };

  return withDarkMode(lightScales);
};

// ─── CSS Formatter ───────────────────────────────────────────────────────────

const round = (n: number, digits: number): number =>
  Math.round(n * 10 ** digits) / 10 ** digits;

export const oklchToHex = (color: Oklch): string =>
  formatHex({ mode: "oklch", l: color.l, c: color.c, h: color.h }) ?? "#000000";

export const formatOklch = (color: Oklch): string =>
  `oklch(${round(color.l, 4)} ${round(color.c, 4)} ${round(color.h, 2)})`;

const scaleEntries = (scales: ColorScales, mode: "light" | "dark"): string[] =>
  Object.entries(scales).flatMap(([role, scale]) =>
    Object.entries(scale).map(
      ([step, { light, dark }]) =>
        `  --color-${role}-${step}: ${formatOklch(mode === "light" ? light : dark)};`,
    ),
  );

export const toCssCustomProperties = (scales: ColorScales): string =>
  [
    ":root {",
    ...scaleEntries(scales, "light"),
    "}",
    "",
    '[data-theme="dark"] {',
    ...scaleEntries(scales, "dark"),
    "}",
  ].join("\n");
