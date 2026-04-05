// src/generator/index.ts

import type { UserInputs, DesignSystem, DesignTokens } from "../schema/types.js";
import { getArchetype } from "../schema/archetypes.js";
import { renderDesignMd } from "../schema/template.js";
import { generateScales, oklchToHex } from "./color.js";
import { generateTypography } from "./typography.js";
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

export function generate(inputs: UserInputs): GenerateResult {
  const archetype = getArchetype(inputs.mood);

  // Generate all subsystems
  const scales = generateScales(inputs.primaryColor);
  const fontFamily = inputs.fontFamily || archetype.defaultFont;
  const typography = generateTypography(archetype, fontFamily);
  const components = generateComponents(archetype);
  const layout = generateLayout(archetype);
  const elevation = generateElevation(archetype, scales);
  const responsive = generateResponsive();

  // Template variable map
  const vars: Record<string, string> = {
    brandName: inputs.brandName,
    primaryHex: inputs.primaryColor,
    fontFamily,
    "fontWeights.heading": String(archetype.fontWeights.heading),
    "fontWeights.ui": String(archetype.fontWeights.ui),
    "fontWeights.body": String(archetype.fontWeights.body),
  };

  // Build theme with replaced placeholders
  const atmosphere = replacePlaceholders(archetype.atmosphereTemplate, vars);
  const characteristics = replaceInArray(archetype.characteristics, vars);
  const dos = replaceInArray(archetype.dos, vars);
  const donts = replaceInArray(archetype.donts, vars);

  // Build agent guide — convert Oklch to hex for display
  const primaryHex = oklchToHex(scales.brand["700"].light);
  const surfaceBase = oklchToHex(scales.gray["100"].light);
  const neutral900 = oklchToHex(scales.gray["900"].light);
  const neutral600 = oklchToHex(scales.gray["600"].light);
  const borderDefault = oklchToHex(scales.gray["400"].light);
  const accentHex = oklchToHex(scales.accent["700"].light);

  const quickColors = [
    { name: "Primary CTA", hex: primaryHex },
    { name: "Background", hex: surfaceBase },
    { name: "Heading Text", hex: neutral900 },
    { name: "Body Text", hex: neutral600 },
    { name: "Border", hex: borderDefault },
    { name: "Accent", hex: accentHex },
  ];

  const examplePrompts = [
    `Create a hero section with a heading in ${fontFamily} weight ${archetype.fontWeights.heading}, background ${surfaceBase}, and a CTA button using ${primaryHex}.`,
    `Build a card component with ${archetype.cardRadius} border-radius, a subtle border using ${borderDefault}, and padding of 24px.`,
    `Design a navigation bar with background ${surfaceBase}, link color ${neutral900}, and an active indicator using ${primaryHex}.`,
    `Create a form input with ${archetype.inputRadius} radius, border ${borderDefault}, and focus ring using ${primaryHex}33.`,
    `Design a section divider using ${accentHex} as an accent stripe, with ${archetype.sectionSpacing} of vertical spacing around it.`,
  ];

  const iterationTips = [
    `Adjust the gray undertone by changing grayChroma config — higher values make grays warmer/cooler.`,
    `Tweak the border-radius scale starting from the button radius (${archetype.buttonRadius}) to shift the personality from sharp/technical to soft/friendly.`,
    `Change font weights (currently heading: ${archetype.fontWeights.heading}, UI: ${archetype.fontWeights.ui}, body: ${archetype.fontWeights.body}) to increase contrast or reduce hierarchy intensity.`,
    `Modify the shadow intensity (${archetype.shadowIntensity}) to control perceived depth — whisper feels flat/editorial, dramatic feels physical/energetic.`,
  ];

  const system: DesignSystem = {
    brandName: inputs.brandName,
    mood: inputs.mood,
    theme: {
      atmosphere,
      characteristics,
    },
    colors: scales,
    typography,
    components,
    layout,
    elevation,
    responsive,
    dos,
    donts,
    agentGuide: {
      quickColors,
      examplePrompts,
      iterationTips,
    },
  };

  const designMd = renderDesignMd(system);

  // Build 3-layer token system
  const primitive = generatePrimitive(scales);
  const semantic = generateSemantic(primitive);
  const component = generateComponent(semantic);
  const tokens = buildDesignTokens(system, primitive, semantic, component);

  // Generate token file strings
  const tokenFiles: Record<string, string> = {
    "primitive.ts": writePrimitiveTs(primitive),
    "semantic.ts": writeSemanticTs(semantic),
    "component.ts": writeComponentTs(component),
    "index.ts": writeIndexTs(),
  };

  return { system, designMd, tokens, tokenFiles };
}
