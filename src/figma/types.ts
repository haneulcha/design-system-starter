export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaVariable {
  name: string;
  type: "COLOR" | "FLOAT";
  valuesByMode: Record<string, string | number>;
}

export interface FigmaVariableCollection {
  name: string;
  modes: { name: string; modeId: string }[];
  variables: FigmaVariable[];
}

export interface FigmaTextStyle {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface FigmaShadowLayer {
  type: "DROP_SHADOW";
  color: FigmaColor;
  offset: { x: number; y: number };
  radius: number;
  spread: number;
}

export interface FigmaEffectStyle {
  name: string;
  shadows: FigmaShadowLayer[];
}

export interface FigmaDesignSystem {
  variableCollections: FigmaVariableCollection[];
  textStyles: FigmaTextStyle[];
  effectStyles: FigmaEffectStyle[];
}
