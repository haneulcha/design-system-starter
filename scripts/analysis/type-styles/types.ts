export interface TypeStyleRow {
  system: string;
  rawRole: string;
  font: string | null;
  sizePx: number | null;
  weight: number | null;
  weightRange?: [number, number];
  lineHeight: number | null;
  lineHeightRange?: [number, number];
  letterSpacingPx: number | null;
  letterSpacingRange?: [number, number];
  uppercase?: boolean;
  features: string[];
  notes: string;
  rowIndex: number;
}

export interface FontFamilyMetadata {
  primary: string | null;
  primaryFallbacks: string[];
  mono: string | null;
  monoFallbacks: string[];
  display: string | null;
  openTypeFeatures: string[];
}

export interface SystemResult {
  system: string;
  hasTypographySection: boolean;
  rows: TypeStyleRow[];
  fontFamily: FontFamilyMetadata;
  principlesText: string;
}

export interface FrequencyEntry {
  key: string;
  count: number;
  systems: string[];
}
