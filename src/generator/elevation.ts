// src/generator/elevation.ts
//
// Thin adapter that converts the new ElevationCategoryTokens shape
// (src/generator/elevation-category.ts) to the legacy ElevationSystem shape
// consumed by the markdown template, tokens emitter, and Figma transformer.
//
// All elevation logic now lives in elevation-category.ts. This file exists to
// preserve the `DesignSystem.elevation` field's shape during migration; once
// downstream consumers move to `system.elevationTokens` directly, this adapter
// can be deleted.

import type { ElevationSystem } from "../schema/types.js";
import type { ElevationCategoryTokens } from "./elevation-category.js";

export function generateElevation(
  elevationTokens: ElevationCategoryTokens,
): ElevationSystem {
  return {
    levels: elevationTokens.levels.map((l) => ({
      name: capitalize(l.name),
      level: l.level,
      shadow: l.shadow,
      use: l.use,
    })),
    philosophy: elevationTokens.philosophy,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
