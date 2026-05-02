// src/generator/index.ts

import type {
  ArchetypePreset,
  UserInputs,
  DesignSystem,
  DesignTokens,
} from "../schema/types.js";
import { DEFAULT_ARCHETYPE } from "../schema/archetypes.js";
import { renderDesignMd } from "../schema/template.js";
import { oklchToHex } from "./color.js";
import {
  generateColorCategory,
  toLegacyColorScales,
  type ColorCategoryTokens,
} from "./color-category.js";
import { generateTypographyCategory } from "./typography-category.js";
import { generateComponents } from "./components.js";
import { generateLayout } from "./layout.js";
import { generateElevation } from "./elevation.js";
import { generateResponsive } from "./responsive.js";
import {
  generatePrimitive,
  generateSemantic,
  generateComponent,
  buildDesignTokens,
} from "./tokens.js";
import {
  writePrimitiveTs,
  writeSemanticTs,
  writeComponentTs,
  writeIndexTs,
} from "./token-writer.js";

export interface GenerateResult {
  system: DesignSystem;
  designMd: string;
  tokens: DesignTokens;
  tokenFiles: Record<string, string>;
}

function replacePlaceholders(
  text: string,
  vars: Record<string, string>
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    return key in vars ? vars[key] : `{{${key}}}`;
  });
}

function replaceInArray(arr: string[], vars: Record<string, string>): string[] {
  return arr.map((s) => replacePlaceholders(s, vars));
}

function buildAgentGuide(
  inputs: UserInputs,
  fontFamily: string,
  colorTokens: ColorCategoryTokens,
): DesignSystem["agentGuide"] {
  const accentBaseHex = oklchToHex(colorTokens.accent.stops["500"]);
  const surfaceCanvasHex = oklchToHex(colorTokens.neutral.stops["50"]);
  const textInkHex = oklchToHex(colorTokens.neutral.stops["900"]);
  const textBodyHex = oklchToHex(colorTokens.neutral.stops["800"]);
  const hairlineHex = oklchToHex(colorTokens.neutral.stops["300"]);

  const quickColors = [
    { name: "Primary CTA", hex: accentBaseHex },
    { name: "Surface Canvas", hex: surfaceCanvasHex },
    { name: "Text Ink", hex: textInkHex },
    { name: "Text Body", hex: textBodyHex },
    { name: "Hairline / Border", hex: hairlineHex },
  ];

  const examplePrompts = [
    `Create a hero section with a heading in ${fontFamily}, background ${surfaceCanvasHex}, and a CTA button using ${accentBaseHex}.`,
    `Build a card component with a subtle border using ${hairlineHex}, body text in ${textBodyHex}, and 24px padding.`,
    `Design a navigation bar with background ${surfaceCanvasHex}, link color ${textInkHex}, and an active indicator using ${accentBaseHex}.`,
    `Create a form input with border ${hairlineHex} and focus ring using ${accentBaseHex}33.`,
  ];

  const knobs = colorTokens.knobs;
  const iterationTips = [
    `Adjust neutral.tint (current: ${knobs.neutral.tint}) to shift gray undertone — options: achromatic, cool, green, purple.`,
    `Toggle accent.secondary (current: ${knobs.accent.secondary}) and supply brandColorSecondary to add a second accent hue.`,
    `Tune semantic.depth (current: ${knobs.semantic.depth}) to control how many variants are emitted per status role (minimal=bg only, standard=bg+text, rich=bg+text+border).`,
    `Change ${inputs.brandColor} to retune the entire accent scale (lightness spread ±0.18 around the input L is preserved).`,
  ];

  return { quickColors, examplePrompts, iterationTips };
}

/**
 * Build a complete design system from user inputs.
 *
 * The optional `archetype` argument is internal-only — used by showcase
 * scripts that iterate over the legacy mood vocabulary. Callers from the CLI
 * or library API should omit it and accept DEFAULT_ARCHETYPE.
 */
export function generate(
  inputs: UserInputs,
  archetype: ArchetypePreset = DEFAULT_ARCHETYPE,
): GenerateResult {
  // Color: new ColorInput-driven pipeline (proposal §6).
  const colorTokens = generateColorCategory({
    brandColor: inputs.brandColor,
    brandColorSecondary: inputs.brandColorSecondary,
    knobs: inputs.colorKnobs,
  });
  const scales = toLegacyColorScales(colorTokens);

  // Typography: new per-category pipeline.
  // If the caller supplies only the legacy fontFamily field (not typographyKnobs),
  // synthesize a TypographyInput so the font flows through the new schema too.
  const effectiveTypographyInput = inputs.typographyKnobs ?? (
    inputs.fontFamily ? { fontFamily: { sans: inputs.fontFamily } } : undefined
  );
  const typographyTokens = generateTypographyCategory(effectiveTypographyInput);

  // Extract the resolved sans primary for use in agentGuide example prompts.
  // Strip surrounding quotes if the font name contains spaces (e.g. "Mona Sans" → Mona Sans).
  const fontFamily = typographyTokens.fontChains.sans.split(",")[0].trim().replace(/^"|"$/g, "");
  const components = generateComponents(archetype);
  const layout = generateLayout(archetype);
  const elevation = generateElevation(archetype, scales);
  const responsive = generateResponsive();

  const vars: Record<string, string> = {
    brandName: inputs.brandName,
    primaryHex: inputs.brandColor,
    fontFamily,
  };

  const atmosphere = replacePlaceholders(archetype.atmosphereTemplate, vars);
  const characteristics = replaceInArray(archetype.characteristics, vars);
  const dos = replaceInArray(archetype.dos, vars);
  const donts = replaceInArray(archetype.donts, vars);

  const agentGuide = buildAgentGuide(inputs, fontFamily, colorTokens);

  const system: DesignSystem = {
    brandName: inputs.brandName,
    theme: { atmosphere, characteristics },
    colorTokens,
    colors: scales,
    typographyTokens,
    components,
    layout,
    elevation,
    responsive,
    dos,
    donts,
    agentGuide,
  };

  const designMd = renderDesignMd(system);

  // Build 3-layer token system
  const primitive = generatePrimitive(scales);
  const semantic = generateSemantic(colorTokens);
  const component = generateComponent(semantic);
  const tokens = buildDesignTokens(system, primitive, semantic, component);

  const tokenFiles: Record<string, string> = {
    "primitive.ts": writePrimitiveTs(primitive),
    "semantic.ts": writeSemanticTs(semantic),
    "component.ts": writeComponentTs(component),
    "index.ts": writeIndexTs(),
  };

  return { system, designMd, tokens, tokenFiles };
}
