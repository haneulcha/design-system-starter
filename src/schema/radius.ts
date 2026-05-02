// src/schema/radius.ts
//
// Border radius category schema (starter v1).
// Source of truth: docs/research/radius-category-proposal.md.
// Pure spec — types, knob options, fixed constants, style profiles.
// Generation/resolution logic lives in src/generator/radius-category.ts.

// ─── Tier 1 — Scale + Special ────────────────────────────────────────────────

/** 8-stop px radius scale. 2 stops (2, 6) are reserved palette values
 *  not consumed by any v1 token at any style. Kept in scale because
 *  Linear/NVIDIA hairline elements (2px) and Hashicorp/PostHog mid-sharp
 *  values (6px) appear in the corpus as deliberate stops. */
export const SCALE = [0, 2, 4, 6, 8, 12, 16, 24] as const satisfies readonly number[];

/** Non-numeric semantic constants. NOT part of SCALE because they are not
 *  interpolatable. Both are universal across every system that has the
 *  corresponding component (badge → pill, avatar → circle). */
export const SPECIAL = {
  pill: "9999px",
  circle: "50%",
} as const;

// ─── Knobs ───────────────────────────────────────────────────────────────────

export type RadiusStyle = "sharp" | "standard" | "generous" | "pill";

export const RADIUS_STYLE_OPTIONS: readonly RadiusStyle[] = [
  "sharp",
  "standard",
  "generous",
  "pill",
];

/** Per-style mapping for the 3 variable tokens (button, input, card).
 *  Numeric values are px-in-SCALE; the string "pill" resolves to SPECIAL.pill
 *  during generation. */
export interface StyleProfile {
  button: number | "pill";
  input: number | "pill";
  card: number;
}

export const STYLE_PROFILES: Record<RadiusStyle, StyleProfile> = {
  sharp:    { button: 4,      input: 4,      card: 8  },
  standard: { button: 8,      input: 8,      card: 12 },
  generous: { button: 12,     input: 8,      card: 16 },
  pill:     { button: "pill", input: "pill", card: 12 },
};

export interface RadiusInput {
  style?: RadiusStyle;
}

export interface RadiusKnobs {
  style: RadiusStyle;
}

export const DEFAULT_RADIUS_KNOBS: RadiusKnobs = {
  style: "standard",
};

// ─── Tier 2 — Fixed token defaults (the 5 non-style tokens) ──────────────────

/** Token names that are constant across all styles. Their values are inlined
 *  in the generator (none=0, subtle=4, large=24, pill=SPECIAL.pill,
 *  circle=SPECIAL.circle). */
export type RadiusTokenName =
  | "none"
  | "subtle"
  | "button"
  | "input"
  | "card"
  | "large"
  | "pill"
  | "circle";

export const FIXED_TOKEN_VALUES = {
  none: 0,
  subtle: 4,
  large: 24,
  pill: SPECIAL.pill,
  circle: SPECIAL.circle,
} as const;
