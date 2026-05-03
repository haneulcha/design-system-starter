import { useMemo } from "react";
import { generate } from "@core/generator/index.js";
import type { GenerateResult } from "@core/generator/index.js";
import type { ColorScales } from "@core/schema/types.js";
import type { PaletteOverrides } from "@core/schema/archetype-palettes.js";
import type { RadiusInput } from "@core/schema/radius.js";
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
  radiusKnobs?: RadiusInput;
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
        radiusKnobs: state.radiusKnobs,
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
    state.radiusKnobs,
  ]);
}

export { PRESET_NAMES };
export type { PresetName, ColorScales, GenerateResult, RadiusInput, PaletteOverrides };
