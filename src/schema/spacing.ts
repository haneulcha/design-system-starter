// src/schema/spacing.ts
//
// Spacing category schema (starter v1).
// Source of truth: docs/research/spacing-category-proposal.md.
// Pure spec — types, knob options, fixed constants, alias map.
// Generation/resolution logic lives in src/generator/spacing-category.ts.

// ─── Tier 1 — Scale ──────────────────────────────────────────────────────────

/** 12-stop px spacing scale. 4 stops (2, 20, 64, 80) are reserved palette
 *  values not consumed by any v1 alias at default density.
 *  64 + 80 are reachable via the `density` knob; 2 + 20 stay reserved. */
export const SCALE = [
  2, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96,
] as const satisfies readonly number[];

// ─── Tier 2 — Aliases ────────────────────────────────────────────────────────

/** The 7 fixed alias→px mappings from proposal §3.
 *  `section` is computed at generation time from the `density` knob. */
export const BASE_ALIASES = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type SpacingAliasName =
  | "xxs"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "xxl"
  | "section";

// ─── Knobs ───────────────────────────────────────────────────────────────────

export type DensityMode = "comfortable" | "compact" | "dense";

export const DENSITY_OPTIONS: readonly DensityMode[] = [
  "comfortable",
  "compact",
  "dense",
];

/** Density → px value for the `section` alias (proposal §5).
 *  Each value is in SCALE. */
export const DENSITY_TO_SECTION_PX: Record<DensityMode, number> = {
  comfortable: 96,
  compact: 80,
  dense: 64,
};

export interface SpacingInput {
  density?: DensityMode;
}

export interface SpacingKnobs {
  density: DensityMode;
}

export const DEFAULT_SPACING_KNOBS: SpacingKnobs = {
  density: "comfortable",
};
