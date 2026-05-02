// src/generator/color-category.ts
//
// Color category generator (starter v1).
// Consumes ColorInput from src/schema/color.ts and emits computed Tier 1
// (neutral + accent OKLCH scales), Tier 2 (semantic palette OKLCH), and
// Tier 3 (surface/text alias references).
//
// At all defaults the output contains 33 tokens (proposal §7):
//   neutral 9 + accent 5 + semantic 8 + surface 5 + text 6.
//
// Non-standard cardinality knobs (`few`/`rich` for stops/aliases) are not
// implemented yet — those require subsetting decisions left to a follow-on.

import type { ColorScales, ColorStep, Oklch } from "../schema/types.js";
import {
  DEFAULT_COLOR_KNOBS,
  NEUTRAL_L_RANGE,
  NEUTRAL_DEFAULT_CHROMA,
  ACCENT_L_HALF_SPREAD,
  SEMANTIC_PALETTE,
  SEMANTIC_DEPTH_VARIANTS,
  SEMANTIC_DEPTH_INCLUDES_INFO,
  SURFACE_ALIASES_STANDARD,
  TEXT_ALIASES_STANDARD,
} from "../schema/color.js";
import type {
  ColorInput,
  ColorKnobs,
  NeutralStops,
  NeutralTint,
  AccentStops,
  AliasesCardinality,
  SemanticDepth,
  SemanticRole,
  SemanticVariant,
} from "../schema/color.js";
import { parsePrimary } from "./color.js";

// ─── Standard scale layouts ─────────────────────────────────────────────────

/**
 * 9-stop neutral scale (the only stops setting wired in v0.1).
 * Names include every step referenced by SURFACE/TEXT alias maps
 * (50/100/200/300/500/600/800/900) plus 400 to fill the mid-light gap.
 * L distribution borrows the corpus implicit shape: denser at light end.
 */
const NEUTRAL_STOPS_STANDARD: ReadonlyArray<{ readonly name: string; readonly l: number }> = [
  { name: "50", l: 1.0 },
  { name: "100", l: 0.97 },
  { name: "200", l: 0.93 },
  { name: "300", l: 0.87 },
  { name: "400", l: 0.76 },
  { name: "500", l: 0.62 },
  { name: "600", l: 0.5 },
  { name: "800", l: 0.27 },
  { name: "900", l: 0.16 },
];

/** Hue used when neutral.tint is non-achromatic. */
const NEUTRAL_TINT_HUE: Record<NeutralTint, number> = {
  achromatic: 0,
  cool: 250,
  green: 150,
  purple: 290,
};

/** Chroma applied to tinted neutrals (achromatic uses 0). */
const TINTED_NEUTRAL_CHROMA = 0.012;

/**
 * 5-stop accent scale: 4 numeric stops anchored to user L plus `contrast`
 * (the slot referenced by text.on-primary). Offsets sum to ±ACCENT_L_HALF_SPREAD.
 */
const ACCENT_NUMERIC_OFFSETS: ReadonlyArray<{ readonly name: string; readonly dl: number }> = [
  { name: "300", dl: +ACCENT_L_HALF_SPREAD }, // lightest variant
  { name: "500", dl: 0 }, // base (user input L)
  { name: "700", dl: -ACCENT_L_HALF_SPREAD / 2 },
  { name: "900", dl: -ACCENT_L_HALF_SPREAD }, // darkest variant
];

/**
 * If accent base L is below this threshold, contrast is white;
 * otherwise contrast is dark. Brand-aware on-primary text color.
 */
const ACCENT_DARK_THRESHOLD = 0.6;

const ACCENT_CONTRAST_LIGHT: Oklch = { l: 1.0, c: 0, h: 0 };
const ACCENT_CONTRAST_DARK: Oklch = { l: 0.16, c: 0, h: 0 };

/** L/chroma multipliers per semantic variant. */
const SEMANTIC_VARIANT_TARGETS: Record<SemanticVariant, { l: number; cMult: number }> = {
  background: { l: 0.95, cMult: 0.3 },
  text: { l: 0.35, cMult: 1.0 },
  border: { l: 0.75, cMult: 0.55 },
};

const SEMANTIC_BASE_CHROMA = 0.16;

const SEMANTIC_ROLES_ORDER: readonly SemanticRole[] = [
  "error",
  "success",
  "warning",
  "info",
];

// ─── Output types ───────────────────────────────────────────────────────────

export interface NeutralScaleOutput {
  readonly stops: Record<string, Oklch>;
  readonly tint: NeutralTint;
}

export interface AccentScaleOutput {
  readonly stops: Record<string, Oklch>; // includes "contrast" alongside numeric stops
  readonly hue: number;
  readonly baseL: number;
}

export type SemanticTokensOutput = Partial<
  Record<SemanticRole, Partial<Record<SemanticVariant, Oklch>>>
>;

export interface ColorCategoryTokens {
  readonly knobs: ColorKnobs;
  readonly neutral: NeutralScaleOutput;
  readonly accent: AccentScaleOutput;
  readonly accentSecondary?: AccentScaleOutput;
  readonly semantic: SemanticTokensOutput;
  readonly surface: Readonly<Record<string, string>>;
  readonly text: Readonly<Record<string, string>>;
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

const clampNeutralL = (l: number): number =>
  clamp(l, NEUTRAL_L_RANGE.min, NEUTRAL_L_RANGE.max);

export const resolveKnobs = (input: ColorInput): ColorKnobs => {
  const k = input.knobs ?? {};
  return {
    neutral: { ...DEFAULT_COLOR_KNOBS.neutral, ...k.neutral },
    accent: { ...DEFAULT_COLOR_KNOBS.accent, ...k.accent },
    semantic: { ...DEFAULT_COLOR_KNOBS.semantic, ...k.semantic },
    aliases: { ...DEFAULT_COLOR_KNOBS.aliases, ...k.aliases },
  };
};

const assertStandardStops = (
  knob: NeutralStops | AccentStops,
  axis: "neutral.stops" | "accent.stops",
): void => {
  if (knob !== "standard") {
    throw new Error(
      `${axis}="${knob}" is not yet implemented in v0.1; only "standard" is supported.`,
    );
  }
};

const assertStandardCardinality = (knob: AliasesCardinality): void => {
  if (knob !== "standard") {
    throw new Error(
      `aliases.cardinality="${knob}" is not yet implemented in v0.1; only "standard" is supported.`,
    );
  }
};

// ─── Builders ───────────────────────────────────────────────────────────────

export const buildNeutralScale = (
  tint: NeutralTint,
  stopsKnob: NeutralStops,
): NeutralScaleOutput => {
  assertStandardStops(stopsKnob, "neutral.stops");
  const isAchromatic = tint === "achromatic";
  const chroma = isAchromatic ? NEUTRAL_DEFAULT_CHROMA : TINTED_NEUTRAL_CHROMA;
  const hue = NEUTRAL_TINT_HUE[tint];
  const stops = Object.fromEntries(
    NEUTRAL_STOPS_STANDARD.map(({ name, l }) => [
      name,
      { l: clampNeutralL(l), c: chroma, h: hue } satisfies Oklch,
    ]),
  );
  return { stops, tint };
};

export const buildAccentScale = (
  brandHex: string,
  stopsKnob: AccentStops,
): AccentScaleOutput => {
  assertStandardStops(stopsKnob, "accent.stops");
  const base = parsePrimary(brandHex);
  const stops: Record<string, Oklch> = Object.fromEntries(
    ACCENT_NUMERIC_OFFSETS.map(({ name, dl }) => [
      name,
      { l: clampNeutralL(base.l + dl), c: base.c, h: base.h } satisfies Oklch,
    ]),
  );
  const contrastBase =
    base.l < ACCENT_DARK_THRESHOLD ? ACCENT_CONTRAST_LIGHT : ACCENT_CONTRAST_DARK;
  stops.contrast = { ...contrastBase, h: base.h };
  return { stops, hue: base.h, baseL: base.l };
};

export const buildSemanticTokens = (depth: SemanticDepth): SemanticTokensOutput => {
  const variants = SEMANTIC_DEPTH_VARIANTS[depth];
  const includeInfo = SEMANTIC_DEPTH_INCLUDES_INFO[depth];
  const out: SemanticTokensOutput = {};
  for (const role of SEMANTIC_ROLES_ORDER) {
    if (role === "info" && !includeInfo) continue;
    const hue = SEMANTIC_PALETTE[role].hue;
    const roleVariants: Partial<Record<SemanticVariant, Oklch>> = {};
    for (const variant of variants) {
      const { l, cMult } = SEMANTIC_VARIANT_TARGETS[variant];
      roleVariants[variant] = { l, c: SEMANTIC_BASE_CHROMA * cMult, h: hue };
    }
    out[role] = roleVariants;
  }
  return out;
};

const pickAliases = (
  cardinality: AliasesCardinality,
): { surface: Record<string, string>; text: Record<string, string> } => {
  assertStandardCardinality(cardinality);
  return {
    surface: { ...SURFACE_ALIASES_STANDARD },
    text: { ...TEXT_ALIASES_STANDARD },
  };
};

// ─── Main entry ─────────────────────────────────────────────────────────────

export const generateColorCategory = (input: ColorInput): ColorCategoryTokens => {
  if (!input.brandColor) {
    throw new Error("ColorInput.brandColor is required.");
  }
  const knobs = resolveKnobs(input);

  const neutral = buildNeutralScale(knobs.neutral.tint, knobs.neutral.stops);
  const accent = buildAccentScale(input.brandColor, knobs.accent.stops);

  let accentSecondary: AccentScaleOutput | undefined;
  if (knobs.accent.secondary === "on") {
    if (!input.brandColorSecondary) {
      throw new Error(
        "ColorInput.brandColorSecondary is required when accent.secondary='on'.",
      );
    }
    accentSecondary = buildAccentScale(input.brandColorSecondary, knobs.accent.stops);
  }

  const semantic = buildSemanticTokens(knobs.semantic.depth);
  const aliases = pickAliases(knobs.aliases.cardinality);

  return {
    knobs,
    neutral,
    accent,
    ...(accentSecondary ? { accentSecondary } : {}),
    semantic,
    surface: aliases.surface,
    text: aliases.text,
  };
};

// ─── Token counter ──────────────────────────────────────────────────────────

// ─── Legacy ColorScales adapter ─────────────────────────────────────────────

/**
 * Mirror neutral L across [0.10, 1.00] so dark mode reuses the same step
 * names with inverted lightness. Accent and semantic stay light=dark in v0.1
 * (brand color is mode-invariant; semantic dark mode is a v0.2 follow-on).
 */
const invertNeutralLightness = (c: Oklch): Oklch => {
  const inverted = Math.min(
    NEUTRAL_L_RANGE.max,
    Math.max(NEUTRAL_L_RANGE.min, NEUTRAL_L_RANGE.min + NEUTRAL_L_RANGE.max - c.l),
  );
  return { l: inverted, c: c.c, h: c.h };
};

const stepsToColorScale = (
  stops: Record<string, Oklch>,
  toDark: (c: Oklch) => Oklch,
): Record<string, ColorStep> =>
  Object.fromEntries(
    Object.entries(stops).map(([step, light]) => [
      step,
      { light, dark: toDark(light) } satisfies ColorStep,
    ]),
  );

const identity = (c: Oklch): Oklch => c;

/**
 * Adapts ColorCategoryTokens → legacy ColorScales {hue: {step: ColorStep}}.
 * Used by the figma transformer and primitive token writer until those
 * consumers migrate to ColorCategoryTokens directly.
 *
 * Hue keys: "neutral", "accent", optional "accent2", and one per emitted
 * semantic role ("error", "success", "warning", optional "info").
 */
export const toLegacyColorScales = (tokens: ColorCategoryTokens): ColorScales => {
  const scales: Record<string, Record<string, ColorStep>> = {
    neutral: stepsToColorScale(tokens.neutral.stops, invertNeutralLightness),
    accent: stepsToColorScale(tokens.accent.stops, identity),
  };

  if (tokens.accentSecondary) {
    scales.accent2 = stepsToColorScale(tokens.accentSecondary.stops, identity);
  }

  for (const [role, variants] of Object.entries(tokens.semantic)) {
    if (!variants) continue;
    const scale: Record<string, ColorStep> = {};
    for (const [variant, value] of Object.entries(variants)) {
      if (!value) continue;
      scale[variant] = { light: value, dark: value };
    }
    scales[role] = scale;
  }

  return scales;
};

// ─── Token counter ──────────────────────────────────────────────────────────

/** Sum of emitted color values across all tiers (excludes the secondary accent unless present). */
export const countEmittedTokens = (tokens: ColorCategoryTokens): number => {
  const neutralCount = Object.keys(tokens.neutral.stops).length;
  const accentCount = Object.keys(tokens.accent.stops).length;
  const accentSecondaryCount = tokens.accentSecondary
    ? Object.keys(tokens.accentSecondary.stops).length
    : 0;
  const semanticCount = Object.values(tokens.semantic).reduce<number>(
    (sum, variants) => sum + Object.keys(variants ?? {}).length,
    0,
  );
  const surfaceCount = Object.keys(tokens.surface).length;
  const textCount = Object.keys(tokens.text).length;
  return (
    neutralCount +
    accentCount +
    accentSecondaryCount +
    semanticCount +
    surfaceCount +
    textCount
  );
};
