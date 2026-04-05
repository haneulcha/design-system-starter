import { useMemo } from "react";
import { generate } from "@core/generator/index.js";
import type { GenerateResult } from "@core/generator/index.js";
import { generateScales } from "@core/generator/color.js";
import type { ColorScales, MoodArchetype, ColorCharacter } from "@core/schema/types.js";
import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import { transformToFigma } from "@core/figma/transformer.js";
import type { FigmaDesignSystem } from "@core/figma/types.js";

export interface WizardState {
  primaryColor: string;
  colorCharacter: ColorCharacter;
  mood: MoodArchetype;
  fontFamily: string;
  brandName: string;
}

export const DEFAULT_STATE: WizardState = {
  primaryColor: "#5e6ad2",
  colorCharacter: "balanced",
  mood: "precise",
  fontFamily: "Inter",
  brandName: "Untitled",
};

export function useColorScales(primaryColor: string, colorCharacter: ColorCharacter): ColorScales {
  return useMemo(() => {
    try {
      return generateScales(primaryColor, "neutral", colorCharacter);
    } catch {
      return generateScales("#5e6ad2", "neutral", colorCharacter);
    }
  }, [primaryColor, colorCharacter]);
}

export interface FullResult extends GenerateResult {
  figma: FigmaDesignSystem;
}

export function useGenerateResult(state: WizardState): FullResult | null {
  return useMemo(() => {
    try {
      const result = generate({
        brandName: state.brandName,
        primaryColor: state.primaryColor,
        mood: state.mood,
        fontFamily: state.fontFamily,
        colorCharacter: state.colorCharacter,
      });
      const figma = transformToFigma(result.tokens);
      return { ...result, figma };
    } catch {
      return null;
    }
  }, [state.brandName, state.primaryColor, state.mood, state.fontFamily, state.colorCharacter]);
}

export { ARCHETYPES, getArchetype };
export type { MoodArchetype, ColorScales, ColorCharacter, GenerateResult };
