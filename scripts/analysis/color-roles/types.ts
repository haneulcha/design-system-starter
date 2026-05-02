export interface ColorItemRow {
  system: string;
  section_heading: string;
  item_label: string;
  hex: string | null;
  css_var: string | null;
  token_ref: string | null;
  description: string;
  description_first_keywords: string[];
}

export interface SystemResult {
  system: string;
  has_color_section: boolean;
  rows: ColorItemRow[];
}

export interface FrequencyEntry {
  key: string;
  count: number;
  systems: string[];
}
