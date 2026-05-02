// src/generator/color-category.ts
//
// Palette-driven color generator (v2). Replaces the prior knob-based scale
// derivation pipeline. Each preset ships a complete 14-slot palette; this
// module just resolves user overrides on top and pre-computes Oklch values.
//
// Source of truth: src/schema/archetype-palettes.ts.

import type { Oklch, ColorStep, ColorScales } from "../schema/types.js";
import type { PresetName } from "../schema/presets.js";
import {
  ARCHETYPE_PALETTES,
  PALETTE_SLOTS,
  resolvePalette,
  type ArchetypePalette,
  type PaletteOverrides,
  type PaletteSlot,
} from "../schema/archetype-palettes.js";
import { parsePrimary } from "./color.js";

// ─── Input ──────────────────────────────────────────────────────────────────

export interface ColorCategoryInput {
  /** Required. Anchors the palette baseline. */
  readonly preset: PresetName;
  /** Optional per-slot hex overrides on top of the archetype palette. */
  readonly overrides?: PaletteOverrides;
}

// ─── Output ─────────────────────────────────────────────────────────────────

export interface ColorCategoryTokens {
  readonly preset: PresetName;
  /** Effective palette = archetype baseline + overrides applied. */
  readonly palette: ArchetypePalette;
  /** Each slot pre-converted to Oklch — used by the primitive layer. */
  readonly oklch: Readonly<Record<PaletteSlot, Oklch>>;
  /** The diff from the archetype baseline, kept verbatim for inspector reset. */
  readonly overrides: PaletteOverrides;
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export function generateColorCategory(input: ColorCategoryInput): ColorCategoryTokens {
  if (!ARCHETYPE_PALETTES[input.preset]) {
    throw new Error(`generateColorCategory: unknown preset "${input.preset}"`);
  }
  const palette = resolvePalette(input.preset, input.overrides);
  const oklch = Object.fromEntries(
    PALETTE_SLOTS.map((slot) => [slot, parsePrimary(palette[slot])]),
  ) as Record<PaletteSlot, Oklch>;
  return {
    preset: input.preset,
    palette,
    oklch,
    overrides: input.overrides ?? {},
  };
}

// ─── Legacy ColorScales adapter ─────────────────────────────────────────────
//
// Existing primitive-token writer + figma transformer expect ColorScales =
// {hue: {step: ColorStep}}. We collapse the palette into a single "palette"
// hue with the 14 slot names as steps. Dark mode mirrors light for v1
// (palette darkening deferred to v2).

export function toLegacyColorScales(tokens: ColorCategoryTokens): ColorScales {
  const stops: Record<string, ColorStep> = {};
  for (const slot of PALETTE_SLOTS) {
    const v = tokens.oklch[slot];
    stops[slot] = { light: v, dark: v };
  }
  return { palette: stops };
}

// ─── Token counter ──────────────────────────────────────────────────────────

/** Always 14 slots — palette is fixed-shape. Kept for API stability. */
export function countEmittedTokens(_tokens: ColorCategoryTokens): number {
  return PALETTE_SLOTS.length;
}
