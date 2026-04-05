// src/schema/types.ts

// ═══ User Inputs ═══

export type MoodArchetype =
  | "precise"
  | "confident"
  | "expressive"
  | "modern";

export type ColorCharacter = "vivid" | "balanced" | "muted";

export interface UserInputs {
  brandName: string;
  primaryColor: string;
  mood: MoodArchetype;
  fontFamily: string;
  colorCharacter: ColorCharacter;
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

export interface ComponentSize {
  height: string;       // spacing token name, e.g. "spacing.xl"
  paddingX: string;     // spacing token name
  gap: string;          // spacing token name
  fontSize: string;     // typography style name
  iconSize: string;     // spacing token name
  radius: string;       // radius token name
}

export interface ButtonSpec {
  sizes: Record<string, ComponentSize>;  // sm, md, lg
  variants: string[];                     // ["primary", "secondary", "ghost"]
}

export interface InputSpec {
  fieldHeight: string;
  fieldPaddingX: string;
  fieldRadius: string;
  labelFieldGap: string;
  fieldHelperGap: string;
  labelFont: string;
  valueFont: string;
  helperFont: string;
  iconSize: string;
  states: string[];
}

export interface CardSpec {
  radius: string;
  contentPadding: string;
  contentGap: string;
  shadow: string;
  headerFont: string;
  bodyFont: string;
  footerGap: string;
  variants: string[];
}

export interface BadgeSpec {
  sizes: Record<string, {
    height: string;
    paddingX: string;
    radius: string;
    font: string;
  }>;
  variants: string[];
}

export interface DividerSpec {
  lineHeight: string;
  labelPaddingX: string;
  labelFont: string;
}

export interface ComponentSpecs {
  button: ButtonSpec;
  input: InputSpec;
  card: CardSpec;
  badge: BadgeSpec;
  divider: DividerSpec;
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
  colors: ColorScales;
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

// ═══ Design Tokens — 3-Layer Architecture ═══

/** Layer 1: Raw scale values. Each color has 10 steps, each step has light+dark hex. */
export interface PrimitiveTokens {
  colors: Record<string, Record<string, { light: string; dark: string }>>;
  // e.g. { gray: { "100": { light: "#fafafa", dark: "#111111" }, ... }, blue: { ... } }
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
  brand: { name: string; mood: MoodArchetype };
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
