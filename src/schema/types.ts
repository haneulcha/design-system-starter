// src/schema/types.ts

// ═══ User Inputs ═══

export type MoodArchetype =
  | "clean-minimal"
  | "warm-friendly"
  | "bold-energetic"
  | "professional"
  | "playful-creative";

export interface UserInputs {
  brandName: string;
  primaryColor: string;
  mood: MoodArchetype;
  fontFamily: string;
}

// ═══ Color ═══

export interface ColorRole {
  name: string;
  hex: string;
  description: string;
}

export interface ColorPalette {
  primary: ColorRole[];
  accent: ColorRole[];
  neutral: ColorRole[];
  semantic: ColorRole[];
  surface: ColorRole[];
  border: ColorRole[];
  dark: {
    surface: ColorRole[];
    text: ColorRole[];
    border: ColorRole[];
  };
}

// ═══ Typography ═══

export interface TypeStyle {
  role: string;
  font: string;
  size: string;
  weight: number;
  lineHeight: string;
  letterSpacing: string;
  notes: string;
}

export interface TypographySystem {
  families: {
    primary: string;
    primaryFallback: string;
    mono: string;
    monoFallback: string;
  };
  hierarchy: TypeStyle[];
  principles: string[];
}

// ═══ Components ═══

export interface ButtonVariant {
  name: string;
  background: string;
  text: string;
  padding: string;
  radius: string;
  shadow: string;
  hoverBg: string;
  use: string;
}

export interface ComponentSpecs {
  buttons: ButtonVariant[];
  cards: {
    background: string;
    border: string;
    radius: string;
    shadow: string;
    padding: string;
    hoverEffect: string;
  };
  inputs: {
    background: string;
    border: string;
    radius: string;
    focusBorder: string;
    focusShadow: string;
    padding: string;
    textColor: string;
    placeholderColor: string;
  };
  navigation: {
    background: string;
    position: string;
    linkSize: string;
    linkWeight: number;
    linkColor: string;
    activeIndicator: string;
  };
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
  mood: MoodArchetype;
  theme: { atmosphere: string; characteristics: string[] };
  colors: ColorPalette;
  typography: TypographySystem;
  components: ComponentSpecs;
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
export type ShadowIntensity = "whisper" | "subtle" | "medium" | "dramatic";

export interface ArchetypePreset {
  mood: MoodArchetype;
  label: string;
  description: string;
  atmosphereTemplate: string;
  characteristics: string[];
  defaultFont: string;
  defaultFontFallback: string;
  monoFont: string;
  monoFontFallback: string;
  fontWeights: { heading: number; ui: number; body: number };
  headingLetterSpacing: string;
  bodyLineHeight: string;
  headingLineHeight: string;
  sectionSpacing: string;
  componentSpacing: string;
  buttonRadius: string;
  cardRadius: string;
  inputRadius: string;
  pillRadius: string;
  shadowIntensity: ShadowIntensity;
  neutralUndertone: NeutralUndertone;
  dos: string[];
  donts: string[];
  suggestedFonts: { name: string; fallback: string }[];
}

// ═══ Design Tokens (for Figma bridge) ═══

export interface DesignTokens {
  brand: { name: string; mood: MoodArchetype };
  color: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  typography: {
    families: Record<string, string>;
    styles: Record<
      string,
      {
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        lineHeight: number;
        letterSpacing: number;
      }
    >;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  elevation: Record<string, string>;
  breakpoint: Record<string, number>;
}
