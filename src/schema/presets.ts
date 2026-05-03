// src/schema/presets.ts
//
// Cross-category knob bundles. Each preset is an editorial pairing — the
// archetype's atmospheric intent translated into actual category knobs.
//
// Color is NOT a knob bundle — each preset gets its full palette from
// src/schema/archetype-palettes.ts. Other categories (typography/spacing/
// radius/elevation/components) still use knobs.

import type { TypographyInput } from "./typography.js";
import type { SpacingInput } from "./spacing.js";
import type { RadiusInput } from "./radius.js";
import type { ElevationInput } from "./elevation.js";
import type { ComponentInput } from "./components.js";

export type PresetName =
  | "clean-minimal"
  | "warm-friendly"
  | "bold-energetic"
  | "professional"
  | "playful-creative";

export const PRESET_NAMES: readonly PresetName[] = [
  "clean-minimal",
  "warm-friendly",
  "bold-energetic",
  "professional",
  "playful-creative",
];

/** A preset is a bag of optional category knobs. Generate() merges this with
 *  user-supplied knobs at top level (user wins per category). */
export interface PresetBundle {
  typographyKnobs?: TypographyInput;
  spacingKnobs?: SpacingInput;
  radiusKnobs?: RadiusInput;
  elevationKnobs?: ElevationInput;
  componentKnobs?: ComponentInput;
}

export const PRESETS: Record<PresetName, PresetBundle> = {
  "clean-minimal": {
    typographyKnobs: { headingStyle: "flat" },
    spacingKnobs: { density: "compact" },
    radiusKnobs: { style: "sharp" },
    elevationKnobs: { style: "shadow", intensity: "whisper" },
    componentKnobs: { cardSurface: "outlined", buttonShape: "rect" },
  },

  "warm-friendly": {
    typographyKnobs: { headingStyle: "default" },
    spacingKnobs: { density: "compact" },
    radiusKnobs: { style: "standard" },
    elevationKnobs: { style: "shadow", intensity: "subtle" },
    componentKnobs: { cardSurface: "filled", buttonShape: "rect" },
  },

  "bold-energetic": {
    typographyKnobs: { headingStyle: "bold" },
    spacingKnobs: { density: "dense" },
    radiusKnobs: { style: "standard" },
    elevationKnobs: { style: "shadow", intensity: "dramatic" },
    componentKnobs: { cardSurface: "elevated", buttonShape: "pill" },
  },

  "professional": {
    typographyKnobs: { headingStyle: "default" },
    spacingKnobs: { density: "compact" },
    radiusKnobs: { style: "sharp" },
    elevationKnobs: { style: "shadow", intensity: "subtle" },
    componentKnobs: { cardSurface: "outlined", buttonShape: "rect" },
  },

  "playful-creative": {
    typographyKnobs: { headingStyle: "bold" },
    spacingKnobs: { density: "comfortable" },
    radiusKnobs: { style: "generous" },
    elevationKnobs: { style: "shadow", intensity: "dramatic" },
    componentKnobs: { cardSurface: "filled", buttonShape: "pill" },
  },
};
