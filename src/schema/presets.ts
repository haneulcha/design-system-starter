// src/schema/presets.ts
//
// Cross-category knob bundles. Each preset is an editorial pairing — the
// archetype's atmospheric intent translated into actual category knobs.
// Ships as v1 of the "preset bundle" feature mentioned in the playbook §4.1
// rejected-alternatives log: "if a 'preset bundles' feature is added — e.g.
// `preset: 'professional'` autoselects matching color knobs + heading style
// + radius — the 5 archetypes are still in src/schema/archetypes.ts."
//
// Source intent: src/schema/archetypes.ts (the prose, dos, donts).
// Knob vocab: each category's schema (color/typography/spacing/radius/
// elevation/components).

import type { PartialColorKnobs } from "./color.js";
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
 *  user-supplied knobs at top level (user wins per category). Nested partial
 *  overrides within a single category (e.g., overriding only colorKnobs.accent
 *  while keeping the preset's colorKnobs.neutral) are not supported in v1 —
 *  if you supply colorKnobs, you replace the whole preset's colorKnobs. */
export interface PresetBundle {
  colorKnobs?: PartialColorKnobs;
  typographyKnobs?: TypographyInput;
  spacingKnobs?: SpacingInput;
  radiusKnobs?: RadiusInput;
  elevationKnobs?: ElevationInput;
  componentKnobs?: ComponentInput;
}

// Caveat 1: warm-friendly and playful-creative are keyed `archetypes.warm-*`
// to a warm neutral undertone. The color category's NeutralTint vocabulary
// (achromatic / cool / green / purple) does NOT include "warm" because the
// corpus showed 0/56 systems use warm-tinted neutrals (color proposal §4.1
// rejected). These two presets therefore use `achromatic` and lean on
// elevation/component knobs to express warmth instead.
//
// Caveat 2: no preset sets `accent.secondary: "on"` even though bold-energetic
// and playful-creative would benefit from a second accent. The color category
// requires `brandColorSecondary` as a paired input when `accent.secondary` is
// on, and silently falling back when the user hasn't supplied one would be
// confusing. Recommend the secondary explicitly via documentation rather than
// implicitly via preset.

export const PRESETS: Record<PresetName, PresetBundle> = {
  "clean-minimal": {
    colorKnobs: {
      neutral: { tint: "achromatic" },
      semantic: { depth: "minimal" },
    },
    typographyKnobs: { headingStyle: "flat" },
    spacingKnobs: { density: "compact" },
    radiusKnobs: { style: "sharp" },
    elevationKnobs: { style: "shadow", intensity: "whisper" },
    componentKnobs: { cardSurface: "outlined", buttonShape: "rect" },
  },

  "warm-friendly": {
    colorKnobs: {
      neutral: { tint: "achromatic" },
      semantic: { depth: "standard" },
    },
    typographyKnobs: { headingStyle: "default" },
    spacingKnobs: { density: "compact" },
    radiusKnobs: { style: "standard" },
    elevationKnobs: { style: "shadow", intensity: "subtle" },
    componentKnobs: { cardSurface: "filled", buttonShape: "rect" },
  },

  "bold-energetic": {
    colorKnobs: {
      neutral: { tint: "achromatic" },
      semantic: { depth: "rich" },
    },
    typographyKnobs: { headingStyle: "bold" },
    spacingKnobs: { density: "dense" },
    radiusKnobs: { style: "standard" },
    elevationKnobs: { style: "shadow", intensity: "dramatic" },
    componentKnobs: { cardSurface: "elevated", buttonShape: "pill" },
  },

  "professional": {
    colorKnobs: {
      neutral: { tint: "cool" },
      semantic: { depth: "standard" },
    },
    typographyKnobs: { headingStyle: "default" },
    spacingKnobs: { density: "compact" },
    radiusKnobs: { style: "sharp" },
    elevationKnobs: { style: "shadow", intensity: "subtle" },
    componentKnobs: { cardSurface: "outlined", buttonShape: "rect" },
  },

  "playful-creative": {
    colorKnobs: {
      neutral: { tint: "achromatic" },
      semantic: { depth: "rich" },
    },
    typographyKnobs: { headingStyle: "bold" },
    spacingKnobs: { density: "comfortable" },
    radiusKnobs: { style: "generous" },
    elevationKnobs: { style: "shadow", intensity: "dramatic" },
    componentKnobs: { cardSurface: "filled", buttonShape: "pill" },
  },
};
