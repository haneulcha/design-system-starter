// src/generator/spacing-category.ts
//
// Spacing category generator (starter v1).
// Consumes schema constants from src/schema/spacing.ts and emits the
// resolved scale + alias map.
//
// At all defaults the output contains 20 tokens (proposal §7):
//   12 (scale) + 8 (aliases incl. computed `section`).

import {
  SCALE,
  BASE_ALIASES,
  DENSITY_OPTIONS,
  DENSITY_TO_SECTION_PX,
  DEFAULT_SPACING_KNOBS,
  type DensityMode,
  type SpacingAliasName,
  type SpacingInput,
  type SpacingKnobs,
} from "../schema/spacing.js";

// ─── Output types ────────────────────────────────────────────────────────────

export interface SpacingCategoryTokens {
  /** Full 12-stop px scale (raw-token escape hatch). */
  scale: readonly number[];
  /** 8 named aliases. `section` is resolved from the density knob. */
  aliases: Record<SpacingAliasName, number>;
  /** Resolved knobs for downstream consumers (e.g., agent guide tips). */
  knobs: SpacingKnobs;
}

// ─── Knob resolution ─────────────────────────────────────────────────────────

export function resolveKnobs(input: SpacingInput | undefined): SpacingKnobs {
  if (!input) return { ...DEFAULT_SPACING_KNOBS };

  const density: DensityMode =
    input.density != null && (DENSITY_OPTIONS as readonly string[]).includes(input.density)
      ? input.density
      : DEFAULT_SPACING_KNOBS.density;

  return { density };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function resolveSection(density: DensityMode): number {
  return DENSITY_TO_SECTION_PX[density];
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function generateSpacingCategory(
  input?: SpacingInput,
): SpacingCategoryTokens {
  const knobs = resolveKnobs(input);
  const aliases: Record<SpacingAliasName, number> = {
    ...BASE_ALIASES,
    section: resolveSection(knobs.density),
  };
  return { scale: SCALE, aliases, knobs };
}

// ─── Token counter ───────────────────────────────────────────────────────────

/** Returns the total token count per proposal §7:
 *  12 (scale) + 8 (aliases) = 20 at all defaults. */
export function countEmittedTokens(tokens: SpacingCategoryTokens): number {
  return tokens.scale.length + Object.keys(tokens.aliases).length;
}
