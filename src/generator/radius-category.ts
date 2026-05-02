// src/generator/radius-category.ts
//
// Border radius category generator (starter v1).
// Consumes schema constants from src/schema/radius.ts and emits the
// resolved scale + special + named token map.
//
// At all defaults the output contains 18 tokens (proposal §7):
//   8 (scale) + 2 (special) + 8 (named tokens).

import {
  SCALE,
  SPECIAL,
  STYLE_PROFILES,
  RADIUS_STYLE_OPTIONS,
  DEFAULT_RADIUS_KNOBS,
  FIXED_TOKEN_VALUES,
  type RadiusStyle,
  type RadiusInput,
  type RadiusKnobs,
  type RadiusTokenName,
  type StyleProfile,
} from "../schema/radius.js";

// ─── Output types ────────────────────────────────────────────────────────────

/** Token values are numeric (px) or string ('9999px', '50%'). */
export type RadiusTokenValue = number | string;

export interface RadiusCategoryTokens {
  /** Full 8-stop px scale (raw-token escape hatch). */
  scale: readonly number[];
  /** The 2 non-numeric semantic constants. */
  special: typeof SPECIAL;
  /** 8 named tokens. button/input/card vary by style; the rest are fixed. */
  tokens: Record<RadiusTokenName, RadiusTokenValue>;
  /** Resolved knobs for downstream consumers. */
  knobs: RadiusKnobs;
}

// ─── Knob resolution ─────────────────────────────────────────────────────────

export function resolveKnobs(input: RadiusInput | undefined): RadiusKnobs {
  if (!input) return { ...DEFAULT_RADIUS_KNOBS };

  const style: RadiusStyle =
    input.style != null && (RADIUS_STYLE_OPTIONS as readonly string[]).includes(input.style)
      ? input.style
      : DEFAULT_RADIUS_KNOBS.style;

  return { style };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve a per-style profile entry to its emitted token value.
 *  Numeric stays numeric (px); the literal string "pill" becomes SPECIAL.pill. */
export function resolveProfileValue(value: number | "pill"): RadiusTokenValue {
  return value === "pill" ? SPECIAL.pill : value;
}

export function resolveStyleProfile(style: RadiusStyle): {
  button: RadiusTokenValue;
  input: RadiusTokenValue;
  card: RadiusTokenValue;
} {
  const profile: StyleProfile = STYLE_PROFILES[style];
  return {
    button: resolveProfileValue(profile.button),
    input: resolveProfileValue(profile.input),
    card: resolveProfileValue(profile.card),
  };
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function generateRadiusCategory(
  input?: RadiusInput,
): RadiusCategoryTokens {
  const knobs = resolveKnobs(input);
  const styleProfile = resolveStyleProfile(knobs.style);

  const tokens: Record<RadiusTokenName, RadiusTokenValue> = {
    none: FIXED_TOKEN_VALUES.none,
    subtle: FIXED_TOKEN_VALUES.subtle,
    button: styleProfile.button,
    input: styleProfile.input,
    card: styleProfile.card,
    large: FIXED_TOKEN_VALUES.large,
    pill: FIXED_TOKEN_VALUES.pill,
    circle: FIXED_TOKEN_VALUES.circle,
  };

  return { scale: SCALE, special: SPECIAL, tokens, knobs };
}

// ─── Token counter ───────────────────────────────────────────────────────────

/** Returns the total token count per proposal §7:
 *  8 (scale) + 2 (special) + 8 (named tokens) = 18 at all defaults. */
export function countEmittedTokens(tokens: RadiusCategoryTokens): number {
  return tokens.scale.length + Object.keys(tokens.special).length + Object.keys(tokens.tokens).length;
}
