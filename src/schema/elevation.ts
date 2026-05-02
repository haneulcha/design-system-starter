// src/schema/elevation.ts
//
// Elevation category schema (starter v1).
// Source of truth: docs/research/elevation-category-proposal.md.
// Pure spec — types, knob options, fixed constants, intensity table.
// Generation/resolution logic lives in src/generator/elevation-category.ts.

// ─── Tier 1 — Levels ─────────────────────────────────────────────────────────

export type ElevationLevelName =
  | "none"
  | "ring"
  | "raised"
  | "floating"
  | "overlay";

/** Universal 5-level taxonomy. Order matters — index = depth tier. */
export const LEVEL_NAMES: readonly ElevationLevelName[] = [
  "none",
  "ring",
  "raised",
  "floating",
  "overlay",
] as const;

/** Stable per-level metadata (semantic role + use). Both fields are static
 *  across all knobs; only the `shadow` string varies at generation time. */
export const LEVEL_META: Record<
  ElevationLevelName,
  { semanticRole: string; use: string }
> = {
  none: {
    semanticRole: "flat surface",
    use: "Page background, inline text, sections",
  },
  ring: {
    semanticRole: "hairline outline",
    use: "Borders, card outlines, dividers",
  },
  raised: {
    semanticRole: "low elevation",
    use: "Resting cards, button-on-hover",
  },
  floating: {
    semanticRole: "medium elevation",
    use: "Dropdowns, popovers, tooltips",
  },
  overlay: {
    semanticRole: "high elevation",
    use: "Modals, dialogs, command palettes",
  },
};

// ─── Knobs ───────────────────────────────────────────────────────────────────

export type ElevationStyle = "shadow" | "ring" | "flat";

export const ELEVATION_STYLE_OPTIONS: readonly ElevationStyle[] = [
  "shadow",
  "ring",
  "flat",
];

export type ElevationIntensity = "whisper" | "subtle" | "medium" | "dramatic";

export const ELEVATION_INTENSITY_OPTIONS: readonly ElevationIntensity[] = [
  "whisper",
  "subtle",
  "medium",
  "dramatic",
];

/** Per-intensity opacity triple for the (raised, floating, overlay) levels.
 *  Only consumed when style="shadow"; ignored under "ring" / "flat". */
export const INTENSITY_OPACITIES: Record<
  ElevationIntensity,
  { raised: number; floating: number; overlay: number }
> = {
  whisper:  { raised: 0.04, floating: 0.05, overlay: 0.08 },
  subtle:   { raised: 0.06, floating: 0.08, overlay: 0.12 },
  medium:   { raised: 0.08, floating: 0.12, overlay: 0.18 },
  dramatic: { raised: 0.12, floating: 0.18, overlay: 0.30 },
};

export interface ElevationInput {
  style?: ElevationStyle;
  intensity?: ElevationIntensity;
}

export interface ElevationKnobs {
  style: ElevationStyle;
  intensity: ElevationIntensity;
}

export const DEFAULT_ELEVATION_KNOBS: ElevationKnobs = {
  style: "shadow",
  intensity: "subtle",
};

/** Fallback ring color used when no neutral palette is supplied
 *  (e.g., schema testing). Matches the prior elevation.ts default. */
export const DEFAULT_RING_COLOR = "#d4d4d4";
