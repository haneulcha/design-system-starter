// src/generator/color.ts

import { formatHex, converter } from "culori";
import type { NeutralUndertone, ColorScales } from "../schema/types.js";

export type { ColorScales };

const toOklch = converter("oklch");

function oklchToHex(l: number, c: number, h: number): string {
  const hex = formatHex({ mode: "oklch", l, c, h });
  return hex ?? "#000000";
}

export interface ColorScale {
  [step: string]: { light: string; dark: string };
}

export function detectHueName(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  if (h < 30) return "red";
  if (h < 70) return "orange";
  if (h < 110) return "yellow";
  if (h < 170) return "green";
  if (h < 250) return "cyan";
  if (h < 310) return "blue";
  if (h < 350) return "purple";
  return "red";
}

// Light mode: step 100=lightest → step 1000=darkest
const LIGHT_STEPS: Array<{ step: string; l: number; cMult: number }> = [
  { step: "100",  l: 0.97, cMult: 0.05 },
  { step: "200",  l: 0.93, cMult: 0.10 },
  { step: "300",  l: 0.87, cMult: 0.20 },
  { step: "400",  l: 0.78, cMult: 0.35 },
  { step: "500",  l: 0.68, cMult: 0.55 },
  { step: "600",  l: 0.58, cMult: 0.75 },
  { step: "700",  l: 0.48, cMult: 0.85 },
  { step: "800",  l: 0.38, cMult: 0.90 },
  { step: "900",  l: 0.30, cMult: 0.80 },
  { step: "1000", l: 0.22, cMult: 0.65 },
];

// Dark mode: step 100=darkest → step 1000=lightest
const DARK_STEPS: Array<{ step: string; l: number; cMult: number }> = [
  { step: "100",  l: 0.15, cMult: 0.05 },
  { step: "200",  l: 0.19, cMult: 0.10 },
  { step: "300",  l: 0.24, cMult: 0.18 },
  { step: "400",  l: 0.30, cMult: 0.30 },
  { step: "500",  l: 0.38, cMult: 0.45 },
  { step: "600",  l: 0.48, cMult: 0.60 },
  { step: "700",  l: 0.58, cMult: 0.70 },
  { step: "800",  l: 0.68, cMult: 0.75 },
  { step: "900",  l: 0.80, cMult: 0.60 },
  { step: "1000", l: 0.93, cMult: 0.30 },
];

function buildScale(baseChroma: number, hue: number): ColorScale {
  const scale: ColorScale = {};
  for (const { step, l, cMult } of LIGHT_STEPS) {
    const lightHex = oklchToHex(l, baseChroma * cMult, hue);
    const darkEntry = DARK_STEPS.find((d) => d.step === step)!;
    const darkHex = oklchToHex(darkEntry.l, baseChroma * darkEntry.cMult, hue);
    scale[step] = { light: lightHex, dark: darkHex };
  }
  return scale;
}

function buildGrayScale(undertone: NeutralUndertone): ColorScale {
  const BASE_GRAY_CHROMA = 0.02;
  let chroma: number;
  let hue: number;

  if (undertone === "warm") {
    chroma = BASE_GRAY_CHROMA * 0.5;
    hue = 70;
  } else if (undertone === "cool") {
    chroma = BASE_GRAY_CHROMA * 0.5;
    hue = 250;
  } else {
    chroma = BASE_GRAY_CHROMA * 0.15;
    hue = 0; // near-zero chroma makes hue irrelevant
  }

  return buildScale(chroma, hue);
}

function huesOverlap(h1: number, h2: number, threshold = 30): boolean {
  const diff = Math.abs(((h1 - h2 + 540) % 360) - 180);
  return diff < threshold;
}

export function generateScales(
  primaryHex: string,
  undertone: NeutralUndertone
): ColorScales {
  const base = toOklch(primaryHex);
  if (!base) throw new Error(`Invalid hex color: ${primaryHex}`);

  const baseC = base.c ?? 0.12;
  const baseH = base.h ?? 0;

  // Fixed status hues
  const STATUS_HUES: Array<{ name: string; hue: number }> = [
    { name: "blue",  hue: 250 },
    { name: "red",   hue: 25  },
    { name: "amber", hue: 75  },
    { name: "green", hue: 145 },
  ];

  // Brand hue name from primary
  const brandHueName = detectHueName(baseH);
  const accentHue = (baseH + 150) % 360;
  const accentHueName = detectHueName(accentHue);

  const scales: ColorScales = {
    gray: buildGrayScale(undertone),
  };

  // Add brand scale (use the detected name so it merges with status if overlapping)
  scales[brandHueName] = buildScale(baseC, baseH);

  // Add accent scale (always add unless it's the same name as brand)
  if (accentHueName !== brandHueName) {
    scales[accentHueName] = buildScale(baseC * 0.85, accentHue);
  }

  // Add fixed status hues. Skip a status hue only when brand or accent has
  // the same detected name (meaning they're the same perceptual hue region).
  // We do NOT suppress by raw angle proximity alone — that can drop status colors
  // that the system still needs (e.g., amber is always needed for warnings).
  for (const { name, hue } of STATUS_HUES) {
    if (scales[name]) continue; // brand/accent already occupies this name slot
    scales[name] = buildScale(0.16, hue);
  }

  return scales;
}
