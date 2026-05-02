import { useMemo } from "react";
import { generate } from "@core/generator/index.js";
import type { GenerateResult } from "@core/generator/index.js";
import type { ColorScales } from "@core/schema/types.js";
import type { PartialColorKnobs } from "@core/schema/color.js";
import type { RadiusInput } from "@core/schema/radius.js";
import type { PresetName } from "@core/schema/presets.js";
import { PRESET_NAMES } from "@core/schema/presets.js";
import { transformToFigma } from "@core/figma/transformer.js";
import type { FigmaDesignSystem } from "@core/figma/types.js";

export interface WizardState {
  brandName: string;
  brandColor: string;
  brandColorSecondary?: string;
  preset: PresetName;
  fontFamily: string;
  /** Per-category overrides. `undefined` = use preset value. */
  colorKnobs?: PartialColorKnobs;
  radiusKnobs?: RadiusInput;
}

export const DEFAULT_STATE: WizardState = {
  brandName: "Untitled",
  brandColor: "#5e6ad2",
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
        brandColor: state.brandColor,
        brandColorSecondary: state.brandColorSecondary,
        fontFamily: state.fontFamily,
        preset: state.preset,
        colorKnobs: state.colorKnobs,
        radiusKnobs: state.radiusKnobs,
      });
      const figma = transformToFigma(result.tokens);
      return { ...result, figma };
    } catch {
      return null;
    }
  }, [
    state.brandName,
    state.brandColor,
    state.brandColorSecondary,
    state.preset,
    state.fontFamily,
    state.colorKnobs,
    state.radiusKnobs,
  ]);
}

export { PRESET_NAMES };
export type { PresetName, ColorScales, GenerateResult, RadiusInput };
