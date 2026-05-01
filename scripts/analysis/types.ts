// scripts/analysis/types.ts

export interface ExtractedRecord {
  system: string;
  // Original 7 (btn_radius semantics changed: null when fully pill)
  btn_radius: number | null;
  is_fully_pill: boolean | null;
  card_radius: number | null;
  heading_weight: number | null;
  body_line_height: number | null;
  heading_letter_spacing: number | null;
  shadow_intensity: ShadowIntensity | null;
  btn_shape: BtnShape | null;
  // Color 3
  brand_l: number | null;
  brand_c: number | null;
  brand_h: number | null;
  // New 3
  dark_mode_present: boolean | null;
  gray_chroma: number | null;
  accent_offset: number | null;
  // Phase C lean (4 new variables)
  typography_has_serif: boolean | null;
  font_family_count: number | null;
  color_palette_size: number | null;
  spacing_range_ratio: number | null;
}

export type ShadowIntensity = 0 | 1 | 2 | 3 | 4; // none | whisper | subtle | medium | dramatic
export type BtnShape = 0 | 1 | 2 | 3;            // sharp | standard | rounded | pill

export const SHADOW_LABELS: readonly string[] = ["none", "whisper", "subtle", "medium", "dramatic"];
export const SHAPE_LABELS: readonly string[] = ["sharp", "standard", "rounded", "pill"];

export const FULL_PILL_THRESHOLD_PX = 999 as const; // values >= this are treated as the "fully pill" sentinel
export const LETTER_SPACING_RANGE: readonly [number, number] = [-6, 2]; // px; clip outliers outside
