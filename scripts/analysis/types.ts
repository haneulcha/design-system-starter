// scripts/analysis/types.ts

export interface ExtractedRecord {
  system: string;
  // Original 7
  btn_radius: number | null;
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
}

export type ShadowIntensity = 0 | 1 | 2 | 3 | 4; // none | whisper | subtle | medium | dramatic
export type BtnShape = 0 | 1 | 2 | 3;            // sharp | standard | rounded | pill

export const SHADOW_LABELS: readonly string[] = ["none", "whisper", "subtle", "medium", "dramatic"];
export const SHAPE_LABELS: readonly string[] = ["sharp", "standard", "rounded", "pill"];
