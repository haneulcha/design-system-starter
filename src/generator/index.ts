// src/generator/index.ts

import type { UserInputs, DesignSystem, DesignTokens, ColorPalette, ColorRole } from "../schema/types.js";
import { getArchetype } from "../schema/archetypes.js";
import { renderDesignMd } from "../schema/template.js";
import { generateScales, detectHueName } from "./color.js";
import type { ColorScales } from "./color.js";
import { converter } from "culori";
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

/** Build a ColorPalette compatible structure from ColorScales for legacy use in DesignSystem/template. */
function buildColorPaletteFromScales(scales: ColorScales, primaryHex: string): ColorPalette {
  const toOklch = converter("oklch");
  const base = toOklch(primaryHex);
  const baseH = base?.h ?? 0;
  const brandHueName = detectHueName(baseH);
  const accentHueAngle = (baseH + 150) % 360;
  const accentHueName = detectHueName(accentHueAngle);

  function step(hue: string, s: string, name: string, description: string): ColorRole {
    return { name, hex: scales[hue]?.[s]?.light ?? "#000000", description };
  }

  const primary: ColorRole[] = [
    step(brandHueName, "700", `${brandHueName} 700`, "Primary brand color"),
    step(brandHueName, "800", `${brandHueName} 800`, "Brand hover / darker"),
    step(brandHueName, "200", `${brandHueName} 200`, "Brand light tint"),
  ];

  const accent: ColorRole[] = [
    step(accentHueName, "700", `${accentHueName} 700`, "Accent primary"),
    step(accentHueName, "200", `${accentHueName} 200`, "Accent light tint"),
  ];

  const neutral: ColorRole[] = [
    step("gray", "1000", "Gray 1000", "Darkest"),
    step("gray", "900",  "Gray 900",  "Near black"),
    step("gray", "800",  "Gray 800",  "Strong text"),
    step("gray", "700",  "Gray 700",  "Muted text"),
    step("gray", "600",  "Gray 600",  "Placeholder"),
    step("gray", "500",  "Gray 500",  "Disabled"),
    step("gray", "400",  "Gray 400",  "Border default"),
    step("gray", "300",  "Gray 300",  "Border subtle"),
    step("gray", "200",  "Gray 200",  "Subtle background"),
    step("gray", "100",  "Gray 100",  "Background base"),
  ];

  const semantic: ColorRole[] = [
    step("green",  "700", "Success",       "Success state"),
    step("red",    "700", "Error",         "Error state"),
    step("amber",  "700", "Warning",       "Warning state"),
    step("blue",   "700", "Info",          "Info state"),
  ];

  const surface: ColorRole[] = [
    step("gray", "100", "Surface Base",   "Main background"),
    step("gray", "200", "Surface Subtle", "Subtle background"),
    step("gray", "300", "Surface Muted",  "Muted background"),
    step("gray", "400", "Surface Raised", "Raised surface"),
  ];

  const border: ColorRole[] = [
    step("gray", "300", "Border Subtle",  "Lightest border"),
    step("gray", "400", "Border Default", "Standard border"),
    step("gray", "600", "Border Strong",  "Strong border"),
  ];

  const dark = {
    surface: [
      { name: "Dark Bg",     hex: scales["gray"]?.["100"]?.dark ?? "#111", description: "Dark background" },
      { name: "Dark Subtle", hex: scales["gray"]?.["200"]?.dark ?? "#1a1a1a", description: "Dark subtle" },
      { name: "Dark Raised", hex: scales["gray"]?.["300"]?.dark ?? "#222", description: "Dark raised" },
    ],
    text: [
      { name: "Dark Text Muted",   hex: scales["gray"]?.["700"]?.dark ?? "#888", description: "Dark muted text" },
      { name: "Dark Text Default", hex: scales["gray"]?.["900"]?.dark ?? "#ccc", description: "Dark default text" },
      { name: "Dark Text Strong",  hex: scales["gray"]?.["1000"]?.dark ?? "#f0f0f0", description: "Dark strong text" },
    ],
    border: [
      { name: "Dark Border Subtle",  hex: scales["gray"]?.["300"]?.dark ?? "#333", description: "Dark subtle border" },
      { name: "Dark Border Default", hex: scales["gray"]?.["400"]?.dark ?? "#444", description: "Dark default border" },
      { name: "Dark Border Strong",  hex: scales["gray"]?.["600"]?.dark ?? "#555", description: "Dark strong border" },
    ],
  };

  return { primary, accent, neutral, semantic, surface, border, dark };
}

export function generate(inputs: UserInputs): GenerateResult {
  const archetype = getArchetype(inputs.mood);

  // Generate all subsystems
  const scales = generateScales(inputs.primaryColor, archetype.neutralUndertone);
  const colors = buildColorPaletteFromScales(scales, inputs.primaryColor);
  const fontFamily = inputs.fontFamily || archetype.defaultFont;
  const typography = generateTypography(archetype, fontFamily);
  const components = generateComponents(archetype);
  const layout = generateLayout(archetype);
  const elevation = generateElevation(archetype, colors);
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

  // Build agent guide
  const primaryHex = colors.primary[0].hex;
  const surfaceBase = colors.surface[0].hex;
  const neutral900 = colors.neutral[1].hex; // Gray 900 — heading text
  const neutral600 = colors.neutral[4].hex; // Gray 600 — body text
  const borderDefault = colors.border[1].hex; // Border Default
  const accentHex = colors.accent[0].hex;

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
    `Adjust the neutral undertone (${archetype.neutralUndertone}) by shifting the gray hue — warmer grays feel approachable, cooler grays feel precise.`,
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
    colors,
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
