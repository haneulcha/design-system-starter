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
  STATUS_SLOTS,
  SURFACE_SLOTS,
  TEXT_SLOTS,
  DARK_NEUTRAL_INVERSION,
  resolvePalette,
  resolveBaseScale,
  type NeutralStop,
  type PaletteOverrides,
  type PaletteSlot,
  type ResolvedPalette,
  type StatusRole,
  type StatusSlot,
  type SurfaceSlot,
  type TextSlot,
} from "../schema/archetype-palettes.js";
import { parsePrimary, oklchToHex } from "./color.js";

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
  /** Resolved 15-slot flat palette (archetype baseline + overrides) — light mode. */
  readonly palette: ResolvedPalette;
  /** Dark-mode palette derived from the light palette via neutral scale inversion. */
  readonly darkPalette: ResolvedPalette;
  /** Effective base scale (9 stops, post-override). Surface/text slots are
   *  derived references into this. */
  readonly baseScale: Readonly<Record<NeutralStop, string>>;
  /** Each slot pre-converted to Oklch — light mode. */
  readonly oklch: Readonly<Record<PaletteSlot, Oklch>>;
  /** Each slot pre-converted to Oklch — dark mode. */
  readonly darkOklch: Readonly<Record<PaletteSlot, Oklch>>;
  /** Each base scale stop pre-converted to Oklch (for primitive emit). */
  readonly baseScaleOklch: Readonly<Record<NeutralStop, Oklch>>;
  /** The diff from the archetype baseline. */
  readonly overrides: PaletteOverrides;
}

// ─── Dark palette helpers ────────────────────────────────────────────────────

/** Apply lightness inversion to status hex pairs for dark mode.
 *  Used by both palette resolution and primitive pseudo-hue emit. */
export function adjustStatusForDark(status: Record<StatusSlot, string>): Record<StatusSlot, string> {
  const result = { ...status } as Record<StatusSlot, string>;
  for (const slot of STATUS_SLOTS) {
    const o = parsePrimary(status[slot]);
    const h = isNaN(o.h) ? 0 : o.h;
    if (slot.endsWith("-bg")) {
      // Light bg tint → dark bg tint: low lightness, retain hue
      result[slot] = oklchToHex({ l: 0.17, c: o.c * 0.4, h });
    } else {
      // Dark saturated text → lighter text for dark bg
      result[slot] = oklchToHex({ l: Math.min(o.l + 0.3, 0.85), c: o.c, h });
    }
  }
  return result;
}

function resolveDarkPalette(
  preset: PresetName,
  overrides?: PaletteOverrides,
): ResolvedPalette {
  const base = ARCHETYPE_PALETTES[preset];
  const effectiveBase: Record<NeutralStop, string> = { ...base.baseScale, ...overrides?.baseScale };

  const surface = Object.fromEntries(
    SURFACE_SLOTS.map((slot) => [
      slot,
      effectiveBase[DARK_NEUTRAL_INVERSION[base.surfaceRefs[slot]]],
    ])
  ) as Record<SurfaceSlot, string>;

  const text = Object.fromEntries(
    TEXT_SLOTS.map((slot) => [
      slot,
      effectiveBase[DARK_NEUTRAL_INVERSION[base.textRefs[slot]]],
    ])
  ) as Record<TextSlot, string>;

  const accent = overrides?.accent ?? base.accent;
  const status = adjustStatusForDark({ ...base.status, ...overrides?.status });

  return { ...surface, ...text, accent, ...status };
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export function generateColorCategory(input: ColorCategoryInput): ColorCategoryTokens {
  if (!ARCHETYPE_PALETTES[input.preset]) {
    throw new Error(`generateColorCategory: unknown preset "${input.preset}"`);
  }
  const palette = resolvePalette(input.preset, input.overrides);
  const darkPalette = resolveDarkPalette(input.preset, input.overrides);
  const baseScale = resolveBaseScale(input.preset, input.overrides);
  const oklch = Object.fromEntries(
    PALETTE_SLOTS.map((slot) => [slot, parsePrimary(palette[slot])]),
  ) as Record<PaletteSlot, Oklch>;
  const darkOklch = Object.fromEntries(
    PALETTE_SLOTS.map((slot) => [slot, parsePrimary(darkPalette[slot])]),
  ) as Record<PaletteSlot, Oklch>;
  const baseScaleOklch = Object.fromEntries(
    NEUTRAL_STOPS.map((stop) => [stop, parsePrimary(baseScale[stop])]),
  ) as Record<NeutralStop, Oklch>;
  return {
    preset: input.preset,
    palette,
    darkPalette,
    baseScale,
    oklch,
    darkOklch,
    baseScaleOklch,
    overrides: input.overrides ?? {},
  };
}

// ─── Legacy ColorScales adapter ─────────────────────────────────────────────
//
// Emits the 6 pseudo-hues consumed by downstream emitters (CSS/Tailwind/Figma):
//   - "neutral": 9 stops (50…900). light = baseScale hex; dark = baseScale at
//      the dark-inverted-position hex (Radix-style scale-position semantics —
//      the var "neutral-50" always means "the lightest backdrop in the
//      current mode", so it darkens automatically in dark mode).
//   - "accent": single -500 stop, identical in light/dark.
//   - "red"/"green"/"amber"/"blue": -50 (status bg) and -500 (status text);
//      dark values come from adjustStatusForDark.

export function toLegacyColorScales(tokens: ColorCategoryTokens): ColorScales {
  // Neutral pseudo-hue.
  const neutral: Record<string, ColorStep> = {};
  for (const stop of NEUTRAL_STOPS) {
    neutral[stop] = {
      light: tokens.baseScaleOklch[stop],
      dark:  tokens.baseScaleOklch[DARK_NEUTRAL_INVERSION[stop]],
    };
  }

  // Accent pseudo-hue.
  const accent: Record<string, ColorStep> = {
    "500": { light: tokens.oklch.accent, dark: tokens.darkOklch.accent },
  };

  // Status hues. Light source comes from the resolved palette; dark is
  // derived via adjustStatusForDark on the same source so light/dark
  // stay paired regardless of the dark palette's own derivation path.
  const statusLightSource: Record<StatusSlot, string> = {
    "error-bg":     tokens.palette["error-bg"],
    "error-text":   tokens.palette["error-text"],
    "success-bg":   tokens.palette["success-bg"],
    "success-text": tokens.palette["success-text"],
    "warning-bg":   tokens.palette["warning-bg"],
    "warning-text": tokens.palette["warning-text"],
    "info-bg":      tokens.palette["info-bg"],
    "info-text":    tokens.palette["info-text"],
  };
  const statusDarkSource = adjustStatusForDark(statusLightSource);

  const buildHue = (role: StatusRole): Record<string, ColorStep> => ({
    "50":  {
      light: parsePrimary(statusLightSource[`${role}-bg` as StatusSlot]),
      dark:  parsePrimary(statusDarkSource[`${role}-bg` as StatusSlot]),
    },
    "500": {
      light: parsePrimary(statusLightSource[`${role}-text` as StatusSlot]),
      dark:  parsePrimary(statusDarkSource[`${role}-text` as StatusSlot]),
    },
  });

  return {
    neutral,
    accent,
    red:   buildHue("error"),
    green: buildHue("success"),
    amber: buildHue("warning"),
    blue:  buildHue("info"),
  };
}

// ─── Token counter ──────────────────────────────────────────────────────────

/** Always 14 slots — palette is fixed-shape. Kept for API stability. */
export function countEmittedTokens(_tokens: ColorCategoryTokens): number {
  return PALETTE_SLOTS.length;
}
