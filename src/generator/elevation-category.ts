// src/generator/elevation-category.ts
//
// Elevation category generator (starter v1).
// Consumes schema constants from src/schema/elevation.ts and emits
// CSS box-shadow strings per the resolved (style, intensity) combo.

import {
  LEVEL_NAMES,
  LEVEL_META,
  ELEVATION_STYLE_OPTIONS,
  ELEVATION_INTENSITY_OPTIONS,
  INTENSITY_OPACITIES,
  DEFAULT_ELEVATION_KNOBS,
  DEFAULT_RING_COLOR,
  type ElevationLevelName,
  type ElevationStyle,
  type ElevationIntensity,
  type ElevationInput,
  type ElevationKnobs,
} from "../schema/elevation.js";

// ─── Output types ────────────────────────────────────────────────────────────

export interface ElevationLevel {
  name: ElevationLevelName;
  /** Numeric depth tier — 0 (none) through 4 (overlay). */
  level: number;
  /** CSS box-shadow value. "none" for the flat case. */
  shadow: string;
  use: string;
}

export interface ElevationCategoryTokens {
  levels: ElevationLevel[];
  knobs: ElevationKnobs;
  philosophy: string;
}

// ─── Knob resolution ─────────────────────────────────────────────────────────

export function resolveKnobs(input: ElevationInput | undefined): ElevationKnobs {
  if (!input) return { ...DEFAULT_ELEVATION_KNOBS };

  const style: ElevationStyle =
    input.style != null && (ELEVATION_STYLE_OPTIONS as readonly string[]).includes(input.style)
      ? input.style
      : DEFAULT_ELEVATION_KNOBS.style;

  const intensity: ElevationIntensity =
    input.intensity != null && (ELEVATION_INTENSITY_OPTIONS as readonly string[]).includes(input.intensity)
      ? input.intensity
      : DEFAULT_ELEVATION_KNOBS.intensity;

  return { style, intensity };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build the 2-layer drop shadow string for a given level + intensity.
 *  The contact layer uses the listed alpha; the ambient layer uses 0.7×.
 *  Per proposal §4 pattern 3 (multi-layer shadows). */
function buildDropShadow(
  level: "raised" | "floating" | "overlay",
  intensity: ElevationIntensity,
): string {
  const alpha = INTENSITY_OPACITIES[intensity][level];
  const ambient = +(alpha * 0.7).toFixed(3);

  // Per-level (contactBlur, ambientBlur, ambientOffset) — corpus-derived.
  const params = {
    raised:   { contact: "0px 1px 2px",   ambient: "0px 1px 3px"   },
    floating: { contact: "0px 4px 8px",   ambient: "0px 2px 4px"   },
    overlay:  { contact: "0px 8px 24px",  ambient: "0px 4px 8px"   },
  }[level];

  return `rgba(0,0,0,${alpha}) ${params.contact}, rgba(0,0,0,${ambient}) ${params.ambient}`;
}

/** Build the shadow string for a single level given the resolved knobs. */
export function buildLevelShadow(
  levelName: ElevationLevelName,
  style: ElevationStyle,
  intensity: ElevationIntensity,
  ringColor: string,
): string {
  if (levelName === "none") return "none";

  // The `ring` level is structural — identical across all styles (proposal §5).
  if (levelName === "ring") return `${ringColor} 0px 0px 0px 1px`;

  if (style === "shadow") {
    return buildDropShadow(levelName, intensity);
  }

  if (style === "ring") {
    // Ring style: stronger ring per level + minimal drop on overlay only.
    const ringWidth = { raised: 1, floating: 2, overlay: 1 }[levelName];
    if (levelName === "overlay") {
      return `${ringColor} 0px 0px 0px ${ringWidth}px, rgba(0,0,0,0.15) 0px 8px 24px`;
    }
    // Slightly stronger color than the universal `ring` level — use 2× hairline.
    return `${ringColor} 0px 0px 0px ${ringWidth}px inset`;
  }

  // style === "flat": only overlay lifts (proposal §4 pattern 2).
  if (levelName === "overlay") return "rgba(0,0,0,0.10) 0px 8px 24px";
  return "none";
}

const PHILOSOPHY_BY_STYLE: Record<ElevationStyle, string> = {
  shadow:
    "Drop shadows render every elevation tier — depth is a primary design tool. Multi-layer shadows give surfaces tactile, physical presence.",
  ring:
    "Hairline ring borders carry depth instead of drop shadows — the cleanest approach for dark themes and precision-engineered systems. Only modals and dialogs add a minimal lift.",
  flat:
    "Almost no shadows. Depth comes from spacing, hairlines, and surface color shifts. Only overlays (modals, dialogs) get a minimal drop shadow for separation from the page.",
};

const INTENSITY_FRAGMENT: Record<ElevationIntensity, string> = {
  whisper:  "Shadows are almost imperceptible — structure comes from spacing and ring borders.",
  subtle:   "Soft shadows that suggest depth without demanding attention. Elevation is felt, not seen.",
  medium:   "Balanced shadow system providing clear depth hierarchy.",
  dramatic: "Bold, confident shadows giving elements real physical presence.",
};

export function buildPhilosophy(style: ElevationStyle, intensity: ElevationIntensity): string {
  if (style === "shadow") {
    return `${PHILOSOPHY_BY_STYLE.shadow} ${INTENSITY_FRAGMENT[intensity]}`;
  }
  return PHILOSOPHY_BY_STYLE[style];
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function generateElevationCategory(
  input?: ElevationInput,
  ringColor?: string,
): ElevationCategoryTokens {
  const knobs = resolveKnobs(input);
  const color = ringColor ?? DEFAULT_RING_COLOR;

  const levels: ElevationLevel[] = LEVEL_NAMES.map((name, idx) => ({
    name,
    level: idx,
    shadow: buildLevelShadow(name, knobs.style, knobs.intensity, color),
    use: LEVEL_META[name].use,
  }));

  return {
    levels,
    knobs,
    philosophy: buildPhilosophy(knobs.style, knobs.intensity),
  };
}

// ─── Token counter ───────────────────────────────────────────────────────────

/** Returns the total token count per proposal §7: 5 (one per level). */
export function countEmittedTokens(tokens: ElevationCategoryTokens): number {
  return tokens.levels.length;
}
