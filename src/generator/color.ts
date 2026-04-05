// src/generator/color.ts

import { formatHex, converter } from "culori";
import type { NeutralUndertone, ColorScales, ColorCharacter } from "../schema/types.js";

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

// Chroma curve derived from Tailwind CSS color scales (oklch analysis).
// Step 500 = user's exact color (cMult 1.0). Peak chroma around 700-800.
// Light mode: step 100=lightest → step 1000=darkest
const LIGHT_STEPS: Array<{ step: string; l: number; cMult: number }> = [
  { step: "100",  l: 0.97, cMult: 0.10 },
  { step: "200",  l: 0.93, cMult: 0.22 },
  { step: "300",  l: 0.87, cMult: 0.40 },
  { step: "400",  l: 0.78, cMult: 0.65 },
  { step: "500",  l: 0.68, cMult: 1.00 },
  { step: "600",  l: 0.58, cMult: 1.15 },
  { step: "700",  l: 0.48, cMult: 1.20 },
  { step: "800",  l: 0.38, cMult: 1.10 },
  { step: "900",  l: 0.30, cMult: 0.90 },
  { step: "1000", l: 0.22, cMult: 0.70 },
];

// Dark mode: step 100=darkest → step 1000=lightest
const DARK_STEPS: Array<{ step: string; l: number; cMult: number }> = [
  { step: "100",  l: 0.15, cMult: 0.07 },
  { step: "200",  l: 0.19, cMult: 0.15 },
  { step: "300",  l: 0.24, cMult: 0.25 },
  { step: "400",  l: 0.30, cMult: 0.40 },
  { step: "500",  l: 0.38, cMult: 0.55 },
  { step: "600",  l: 0.48, cMult: 0.70 },
  { step: "700",  l: 0.58, cMult: 0.85 },
  { step: "800",  l: 0.68, cMult: 0.90 },
  { step: "900",  l: 0.80, cMult: 0.70 },
  { step: "1000", l: 0.93, cMult: 0.35 },
];

function buildScale(baseChroma: number, hue: number, baseLightness?: number): ColorScale {
  // Default anchor: step 500 = L 0.68 (original fixed midpoint)
  const anchor = baseLightness ?? 0.68;
  const defaultAnchor = 0.68;

  // Shift all lightness values so step 500 = anchor,
  // while clamping to valid range [0.05, 0.99]
  function shiftL(originalL: number): number {
    const offset = anchor - defaultAnchor;
    return Math.min(0.99, Math.max(0.05, originalL + offset));
  }

  const scale: ColorScale = {};
  for (const { step, l, cMult } of LIGHT_STEPS) {
    const lightHex = oklchToHex(shiftL(l), baseChroma * cMult, hue);
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

const CHROMA_SCALE: Record<ColorCharacter, number> = {
  vivid: 1.2,    // boost status chroma by 20%
  balanced: 1.0, // use data-derived defaults as-is
  muted: 0.8,    // reduce by 20%
};

export function generateScales(
  primaryHex: string,
  undertone: NeutralUndertone,
  colorCharacter: ColorCharacter = "balanced"
): ColorScales {
  const base = toOklch(primaryHex);
  if (!base) throw new Error(`Invalid hex color: ${primaryHex}`);

  const baseC = base.c ?? 0.12;
  const baseH = base.h ?? 0;

  const chromaScale = CHROMA_SCALE[colorCharacter];

  // Fixed status hues (median from 10 production systems)
  const STATUS_HUES: Array<{ name: string; hue: number; chroma: number }> = [
    { name: "blue",  hue: 258, chroma: 0.22 * chromaScale },
    { name: "red",   hue: 21,  chroma: 0.22 * chromaScale },
    { name: "amber", hue: 76,  chroma: 0.17 * chromaScale },
    { name: "green", hue: 149, chroma: 0.19 * chromaScale },
  ];

  // Brand hue name from primary
  const brandHueName = detectHueName(baseH);
  const accentHue = (baseH + 150) % 360;
  const accentHueName = detectHueName(accentHue);

  const scales: ColorScales = {
    gray: buildGrayScale(undertone),
  };

  // Add brand scale — anchored to user's actual lightness
  const baseL = base.l ?? 0.68;
  scales[brandHueName] = buildScale(baseC, baseH, baseL);

  // Add accent scale — skip if it overlaps with brand OR any status hue (within 30°)
  const statusHueAngles = STATUS_HUES.map((s) => s.hue);
  const accentOverlapsStatus = statusHueAngles.some((h) => huesOverlap(accentHue, h, 30));
  if (accentHueName !== brandHueName && !accentOverlapsStatus) {
    scales[accentHueName] = buildScale(baseC * 0.85 * chromaScale, accentHue);
  }

  // Add fixed status hues. Skip a status hue only when brand or accent has
  // the same detected name (meaning they're the same perceptual hue region).
  // We do NOT suppress by raw angle proximity alone — that can drop status colors
  // that the system still needs (e.g., amber is always needed for warnings).
  for (const { name, hue, chroma } of STATUS_HUES) {
    if (scales[name]) continue; // brand/accent already occupies this name slot
    scales[name] = buildScale(chroma, hue);
  }

  return scales;
}
