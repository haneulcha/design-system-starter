// src/generator/index.ts

import type {
  ArchetypePreset,
  UserInputs,
  DesignSystem,
  DesignTokens,
} from "../schema/types.js";
import { DEFAULT_ARCHETYPE } from "../schema/archetypes.js";
import { PRESETS } from "../schema/presets.js";
import { renderDesignMd } from "../schema/template.js";
import { oklchToHex } from "./color.js";
import {
  generateColorCategory,
  toLegacyColorScales,
  type ColorCategoryTokens,
} from "./color-category.js";
import { generateTypographyCategory } from "./typography-category.js";
import { generateSpacingCategory } from "./spacing-category.js";
import { generateRadiusCategory } from "./radius-category.js";
import { generateElevationCategory } from "./elevation-category.js";
import { generateComponentCategory } from "./components-category.js";
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
  _inputs: UserInputs,
  fontFamily: string,
  colorTokens: ColorCategoryTokens,
): DesignSystem["agentGuide"] {
  const p = colorTokens.palette;

  const quickColors = [
    { name: "Primary CTA",       hex: p.accent },
    { name: "Surface Canvas",    hex: p.canvas },
    { name: "Text Ink",          hex: p.ink },
    { name: "Text Body",         hex: p.body },
    { name: "Hairline / Border", hex: p.hairline },
  ];

  const examplePrompts = [
    `Create a hero section with a heading in ${fontFamily}, background ${p.canvas}, and a CTA button using ${p.accent}.`,
    `Build a card component with a subtle border using ${p.hairline}, body text in ${p.body}, and 24px padding.`,
    `Design a navigation bar with background ${p.canvas}, link color ${p.ink}, and an active indicator using ${p.accent}.`,
    `Create a form input with border ${p.hairline} and focus ring using ${p.accent}33.`,
  ];

  const iterationTips = [
    `Pick a different archetype to swap the entire palette (current: ${colorTokens.preset}).`,
    `Override individual slots via paletteOverrides (e.g. { accent: "#ff0066" }) to drift from the archetype baseline.`,
    `The 8 status slots (error/success/warning/info × bg/text) are universal across archetypes — override per-slot for brand-specific status hues.`,
  ];

  return { quickColors, examplePrompts, iterationTips };
}

/**
 * Build a complete design system from user inputs.
 *
 * The optional `archetype` argument is internal-only — used by showcase
 * scripts that iterate over each preset's editorial document. Callers from
 * the CLI or library API should omit it and accept DEFAULT_ARCHETYPE.
 */
export function generate(
  inputs: UserInputs,
  archetype: ArchetypePreset = DEFAULT_ARCHETYPE,
): GenerateResult {
  // Resolve preset → effective knobs. Top-level field merge: if the user
  // supplies a knob field, it overrides the preset's whole value for that
  // category (no nested-partial merge in v1). Nested partial overrides are
  // a v2 concern; documented in src/schema/presets.ts.
  const presetName = inputs.preset ?? "professional";
  const preset = PRESETS[presetName];
  const typographyKnobs  = inputs.typographyKnobs  ?? preset?.typographyKnobs;
  const spacingKnobs     = inputs.spacingKnobs     ?? preset?.spacingKnobs;
  const radiusKnobs      = inputs.radiusKnobs      ?? preset?.radiusKnobs;
  const elevationKnobs   = inputs.elevationKnobs   ?? preset?.elevationKnobs;
  const componentKnobs   = inputs.componentKnobs   ?? preset?.componentKnobs;

  // Color: palette-driven pipeline. Archetype palette + per-slot overrides.
  const colorTokens = generateColorCategory({
    preset: presetName,
    overrides: inputs.paletteOverrides,
  });
  const scales = toLegacyColorScales(colorTokens);

  // Typography: new per-category pipeline.
  // If the caller supplies only the legacy fontFamily field (not typographyKnobs),
  // synthesize a TypographyInput so the font flows through the new schema too.
  // The preset's typographyKnobs (if any) takes precedence over the synthesized
  // fontFamily-only shape — but the user's fontFamily field is layered on top.
  let effectiveTypographyInput = typographyKnobs;
  if (!effectiveTypographyInput && inputs.fontFamily) {
    effectiveTypographyInput = { fontFamily: { sans: inputs.fontFamily } };
  } else if (effectiveTypographyInput && inputs.fontFamily && !inputs.typographyKnobs?.fontFamily) {
    // Preset supplied headingStyle but user only supplied fontFamily — combine.
    effectiveTypographyInput = { ...effectiveTypographyInput, fontFamily: { sans: inputs.fontFamily } };
  }
  const typographyTokens = generateTypographyCategory(effectiveTypographyInput);

  // Spacing: new per-category pipeline (proposal §5).
  const spacingTokens = generateSpacingCategory(spacingKnobs);

  // Radius: new per-category pipeline (proposal §5).
  const radiusTokens = generateRadiusCategory(radiusKnobs);

  // Elevation: pulls the ring color from the palette's hairline slot
  // (replaces the prior neutral-300 derivation).
  const elevationTokens = generateElevationCategory(elevationKnobs, colorTokens.palette.hairline);

  // Extract the resolved sans primary for use in agentGuide example prompts.
  // Strip surrounding quotes if the font name contains spaces (e.g. "Mona Sans" → Mona Sans).
  const fontFamily = typographyTokens.fontChains.sans.split(",")[0].trim().replace(/^"|"$/g, "");

  // Components: per-category pipeline. Rich token tree is the single source
  // of truth; consumers (template, render-html, figma) read componentTokens
  // directly. Archetype is no longer consulted.
  const componentTokens = generateComponentCategory(componentKnobs);

  const layout = generateLayout(archetype, spacingTokens, radiusTokens);
  const elevation = generateElevation(elevationTokens);
  const responsive = generateResponsive();

  const vars: Record<string, string> = {
    brandName: inputs.brandName,
    primaryHex: colorTokens.palette.accent,
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
    spacingTokens,
    radiusTokens,
    elevationTokens,
    componentTokens,
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
