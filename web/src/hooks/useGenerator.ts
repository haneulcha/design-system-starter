import { useMemo } from "react";
import { generate } from "@core/generator/index.js";
import type { GenerateResult } from "@core/generator/index.js";
import type { ColorScales } from "@core/schema/types.js";
import type { PaletteOverrides } from "@core/schema/archetype-palettes.js";
import type { TypographyInput } from "@core/schema/typography.js";
import type { SpacingInput } from "@core/schema/spacing.js";
import type { RadiusInput } from "@core/schema/radius.js";
import type { ElevationInput } from "@core/schema/elevation.js";
import type { ComponentInput } from "@core/schema/components.js";
import type { PresetName } from "@core/schema/presets.js";
import { PRESET_NAMES } from "@core/schema/presets.js";
import { transformToFigma } from "@core/figma/transformer.js";
import type { FigmaDesignSystem } from "@core/figma/types.js";

export interface WizardState {
  brandName: string;
  preset: PresetName;
  fontFamily: string;
  /** Per-slot palette overrides. `undefined`/empty = pure archetype baseline. */
  paletteOverrides?: PaletteOverrides;
  /** Per-category overrides. `undefined` = use preset value. */
  typographyKnobs?: TypographyInput;
  spacingKnobs?: SpacingInput;
  radiusKnobs?: RadiusInput;
  elevationKnobs?: ElevationInput;
  componentKnobs?: ComponentInput;
}

export const DEFAULT_STATE: WizardState = {
  brandName: "Untitled",
  preset: "professional",
  fontFamily: "Inter",
};

export interface FullResult extends GenerateResult {
  figma: FigmaDesignSystem;
}

export function useGenerateResult(state: WizardState): FullResult | null {
  return useMemo(() => {
    try {
      const result = generate({
        brandName: state.brandName,
        fontFamily: state.fontFamily,
        preset: state.preset,
        paletteOverrides: state.paletteOverrides,
        typographyKnobs: state.typographyKnobs,
        spacingKnobs: state.spacingKnobs,
        radiusKnobs: state.radiusKnobs,
        elevationKnobs: state.elevationKnobs,
        componentKnobs: state.componentKnobs,
      });
      const figma = transformToFigma(result.tokens);
      return { ...result, figma };
    } catch {
      return null;
    }
  }, [
    state.brandName,
    state.preset,
    state.fontFamily,
    state.paletteOverrides,
    state.typographyKnobs,
    state.spacingKnobs,
    state.radiusKnobs,
    state.elevationKnobs,
    state.componentKnobs,
  ]);
}

export { PRESET_NAMES };
export type {
  PresetName,
  ColorScales,
  GenerateResult,
  TypographyInput,
  SpacingInput,
  RadiusInput,
  ElevationInput,
  ComponentInput,
  PaletteOverrides,
};
