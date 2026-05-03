// src/schema/types.ts

import type { ColorCategoryTokens } from "../generator/color-category.js";
import type { TypographyCategoryTokens } from "../generator/typography-category.js";
import type { SpacingCategoryTokens } from "../generator/spacing-category.js";
import type { RadiusCategoryTokens } from "../generator/radius-category.js";
import type { ElevationCategoryTokens } from "../generator/elevation-category.js";
import type { ComponentCategoryTokens } from "../generator/components-category.js";
import type { PaletteOverrides } from "./archetype-palettes.js";
import type { TypographyInput } from "./typography.js";
import type { SpacingInput } from "./spacing.js";
import type { RadiusInput } from "./radius.js";
import type { ElevationInput } from "./elevation.js";
import type { ComponentInput } from "./components.js";
import type { PresetName } from "./presets.js";

// ═══ User Inputs ═══

export interface UserInputs {
  brandName: string;
  fontFamily: string;
  /** Per-slot hex overrides on top of the chosen archetype's palette. */
  paletteOverrides?: PaletteOverrides;
  typographyKnobs?: TypographyInput;
  spacingKnobs?: SpacingInput;
  radiusKnobs?: RadiusInput;
  elevationKnobs?: ElevationInput;
  componentKnobs?: ComponentInput;
  /** Required. Anchors palette, atmosphere, and per-category knob defaults. */
  preset?: PresetName;
}

// ═══ Color ═══

export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

export interface ColorStep {
  readonly light: Oklch;
  readonly dark: Oklch;
}

export interface ColorScales {
  readonly [role: string]: Record<string, ColorStep>;
}

// ═══ Layout ═══

export interface LayoutSystem {
  spacing: { name: string; value: string }[];
  grid: { maxWidth: string; columns: number; gutter: string };
  borderRadius: { name: string; value: string; use: string }[];
  whitespacePhilosophy: string;
}

// ═══ Elevation ═══

export interface ElevationLevel {
  name: string;
  level: number;
  shadow: string;
  use: string;
}

export interface ElevationSystem {
  levels: ElevationLevel[];
  philosophy: string;
}

// ═══ Responsive ═══

export interface Breakpoint {
  name: string;
  minWidth: string;
  maxWidth: string;
  changes: string;
}

export interface ResponsiveSystem {
  breakpoints: Breakpoint[];
  touchTarget: string;
  collapsingStrategy: string[];
  imageBehavior: string[];
}

// ═══ Full Design System ═══

export interface DesignSystem {
  brandName: string;
  theme: { atmosphere: string; characteristics: string[] };
  /** New 3-tier color category output. Source of truth for color rendering. */
  colorTokens: ColorCategoryTokens;
  /**
   * Legacy 10-step ColorScales view, derived from `colorTokens` for the parts of
   * the pipeline (figma transformer, primitive token writer) that still expect
   * a homogeneous {hue: {step: ColorStep}} shape. Will be removed when those
   * consumers migrate to colorTokens directly.
   */
  colors: ColorScales;
  /** New per-category typography output. Source of truth for typography rendering. */
  typographyTokens: TypographyCategoryTokens;
  /** New per-category spacing output. Source of truth for spacing rendering. */
  spacingTokens: SpacingCategoryTokens;
  /** New per-category radius output. Source of truth for radius rendering. */
  radiusTokens: RadiusCategoryTokens;
  /** New per-category elevation output. Source of truth for elevation rendering. */
  elevationTokens: ElevationCategoryTokens;
  componentTokens: ComponentCategoryTokens;
  layout: LayoutSystem;
  elevation: ElevationSystem;
  responsive: ResponsiveSystem;
  dos: string[];
  donts: string[];
  agentGuide: {
    quickColors: { name: string; hex: string }[];
    examplePrompts: string[];
    iterationTips: string[];
  };
}

// ═══ Archetype Preset ═══

export type NeutralUndertone = "cool" | "warm" | "neutral";

export interface ArchetypePreset {
  preset: PresetName;
  label: string;
  description: string;
  atmosphereTemplate: string;
  characteristics: string[];
  neutralUndertone: NeutralUndertone;
  dos: string[];
  donts: string[];
}

// ═══ Design Tokens — 3-Layer Architecture ═══

/** Layer 1: Raw scale values. Each color has 10 steps, each step has light+dark Oklch. */
export interface PrimitiveTokens {
  colors: Record<string, Record<string, ColorStep>>;
}

/** Layer 2: Role-based references to primitive scale positions. No mode branching — primitives handle modes. */
export interface SemanticTokens {
  [role: string]: string;
  // e.g. { "bg/base": "gray-100", "text/primary": "gray-1000", "brand/primary": "blue-700" }
  // Format: "{hue}-{step}"
}

/** Layer 3: Component-scoped. Every value is a key from SemanticTokens */
export interface ComponentTokens {
  [component: string]: {
    [variant: string]: Record<string, string>;
  };
}

export interface DesignTokens {
  brand: { name: string };
  primitive: PrimitiveTokens;
  semantic: SemanticTokens;  // no longer { light, dark } — just flat map
  component: ComponentTokens;
  typography: {
    families: Record<string, string>;
    styles: Record<string, {
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      lineHeight: number;
      letterSpacing: number;
    }>;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  elevation: Record<string, string>;
  breakpoint: Record<string, number>;
}
