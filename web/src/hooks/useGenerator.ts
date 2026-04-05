import { useMemo } from "react";
import { generate } from "@core/generator/index.js";
import type { GenerateResult } from "@core/generator/index.js";
import type { ColorScales, MoodArchetype } from "@core/schema/types.js";
import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import { transformToFigma } from "@core/figma/transformer.js";
import type { FigmaDesignSystem } from "@core/figma/types.js";

export interface WizardState {
  primaryColor: string;
  mood: MoodArchetype;
  fontFamily: string;
  brandName: string;
}

export const DEFAULT_STATE: WizardState = {
  primaryColor: "#5e6ad2",
  mood: "precise",
  fontFamily: "Inter",
  brandName: "Untitled",
};

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
      });
      const figma = transformToFigma(result.tokens);
      return { ...result, figma };
    } catch {
      return null;
    }
  }, [state.brandName, state.primaryColor, state.mood, state.fontFamily]);
}

export { ARCHETYPES, getArchetype };
export type { MoodArchetype, ColorScales, GenerateResult };
