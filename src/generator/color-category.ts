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
  NEUTRAL_STOPS,
  PALETTE_SLOTS,
  resolvePalette,
  resolveBaseScale,
  type NeutralStop,
  type PaletteOverrides,
  type PaletteSlot,
  type ResolvedPalette,
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
  /** Resolved 15-slot flat palette (archetype baseline + overrides). */
  readonly palette: ResolvedPalette;
  /** Effective base scale (9 stops, post-override). Surface/text slots are
   *  derived references into this. */
  readonly baseScale: Readonly<Record<NeutralStop, string>>;
  /** Each slot pre-converted to Oklch — used by the primitive layer. */
  readonly oklch: Readonly<Record<PaletteSlot, Oklch>>;
  /** Each base scale stop pre-converted to Oklch (for primitive emit). */
  readonly baseScaleOklch: Readonly<Record<NeutralStop, Oklch>>;
  /** The diff from the archetype baseline. */
  readonly overrides: PaletteOverrides;
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export function generateColorCategory(input: ColorCategoryInput): ColorCategoryTokens {
  if (!ARCHETYPE_PALETTES[input.preset]) {
    throw new Error(`generateColorCategory: unknown preset "${input.preset}"`);
  }
  const palette = resolvePalette(input.preset, input.overrides);
  const baseScale = resolveBaseScale(input.preset, input.overrides);
  const oklch = Object.fromEntries(
    PALETTE_SLOTS.map((slot) => [slot, parsePrimary(palette[slot])]),
  ) as Record<PaletteSlot, Oklch>;
  const baseScaleOklch = Object.fromEntries(
    NEUTRAL_STOPS.map((stop) => [stop, parsePrimary(baseScale[stop])]),
  ) as Record<NeutralStop, Oklch>;
  return {
    preset: input.preset,
    palette,
    baseScale,
    oklch,
    baseScaleOklch,
    overrides: input.overrides ?? {},
  };
}

// ─── Legacy ColorScales adapter ─────────────────────────────────────────────
//
// Existing primitive-token writer + figma transformer expect ColorScales =
// {hue: {step: ColorStep}}. We emit two pseudo-hues:
//   - "palette": the 15 resolved slot values (consumed by semantic refs)
//   - "neutral": the 9 base scale stops (kept available for downstream
//     consumers that want the underlying gray range)

export function toLegacyColorScales(tokens: ColorCategoryTokens): ColorScales {
  const paletteStops: Record<string, ColorStep> = {};
  for (const slot of PALETTE_SLOTS) {
    const v = tokens.oklch[slot];
    paletteStops[slot] = { light: v, dark: v };
  }
  const neutralStops: Record<string, ColorStep> = {};
  for (const stop of NEUTRAL_STOPS) {
    const v = tokens.baseScaleOklch[stop];
    neutralStops[stop] = { light: v, dark: v };
  }
  return { palette: paletteStops, neutral: neutralStops };
}

// ─── Token counter ──────────────────────────────────────────────────────────

/** Always 14 slots — palette is fixed-shape. Kept for API stability. */
export function countEmittedTokens(_tokens: ColorCategoryTokens): number {
  return PALETTE_SLOTS.length;
}
