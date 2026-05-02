// src/schema/typography.ts
//
// Typography category schema (starter v1).
// Source of truth: docs/research/type-category-proposal.md.
// Pure spec — types, knob options, fixed constants, category profiles.
// Generation/resolution logic lives in src/generator/.

// ─── Categories and variant types ───────────────────────────────────────────

export type TypographyCategory =
  | "heading"
  | "body"
  | "caption"
  | "code"
  | "button"
  | "card"
  | "nav"
  | "link"
  | "badge";

export type SizeVariant = "xs" | "sm" | "md" | "lg" | "xl";

// ─── Tier 1 — Scales ────────────────────────────────────────────────────────

/** 13-stop px size scale. 3 stops (20, 28, 36) are reserved palette values
 *  not consumed by any v1 category default. */
export const SIZE_SCALE = [
  10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64,
] as const satisfies readonly number[];

/** 4-stop weight scale covering 88% of corpus weights. 700 held for raw-token use. */
export const WEIGHT_SCALE = [400, 500, 600, 700] as const satisfies readonly number[];

/** 6-stop unitless line-height scale at 0.1-step granularity. */
export const LINE_HEIGHT_SCALE = [
  1.0, 1.1, 1.2, 1.3, 1.4, 1.5,
] as const satisfies readonly number[];

/** 3 discrete em-based letter-spacing values. "0" not "0em" — consumed as CSS directly. */
export const LETTER_SPACING_VALUES = [
  "-0.02em",
  "0",
  "0.05em",
] as const satisfies readonly string[];

/** Full fallback chains with Korean web-font support (4-tier: brand → Korean → OS → generic). */
export const FONT_FAMILY_CHAINS = {
  sans: 'Inter, Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"Geist Mono", "IBM Plex Mono", D2Coding, "Noto Sans Mono CJK KR", "SF Mono", Consolas, monospace',
  serif: 'Georgia, "Noto Serif KR", "Nanum Myeongjo", "Times New Roman", serif',
} as const;

// ─── Tier 2 — Category profiles ─────────────────────────────────────────────

export interface CategoryProfile {
  fontFamily: "sans" | "mono" | "serif";
  /** px — must be in SIZE_SCALE */
  size: number;
  /** must be in WEIGHT_SCALE */
  weight: number;
  /** must be in LINE_HEIGHT_SCALE */
  lineHeight: number;
  /** must be in LETTER_SPACING_VALUES */
  letterSpacing: string;
}

/**
 * All 20 settled category profiles from proposal §3.
 * Keys: "${category}.${variant}" for multi-variant categories,
 *       "${category}" for single-variant categories (card, nav, link, badge).
 */
export const CATEGORY_PROFILES: Record<string, CategoryProfile> = {
  "heading.xl": { fontFamily: "sans", size: 64, weight: 500, lineHeight: 1.1, letterSpacing: "-0.02em" },
  "heading.lg": { fontFamily: "sans", size: 48, weight: 500, lineHeight: 1.1, letterSpacing: "-0.02em" },
  "heading.md": { fontFamily: "sans", size: 32, weight: 600, lineHeight: 1.2, letterSpacing: "0" },
  "heading.sm": { fontFamily: "sans", size: 24, weight: 600, lineHeight: 1.3, letterSpacing: "0" },
  "heading.xs": { fontFamily: "sans", size: 16, weight: 600, lineHeight: 1.4, letterSpacing: "0" },
  "body.lg":    { fontFamily: "sans", size: 18, weight: 400, lineHeight: 1.5, letterSpacing: "0" },
  "body.md":    { fontFamily: "sans", size: 16, weight: 400, lineHeight: 1.5, letterSpacing: "0" },
  "body.sm":    { fontFamily: "sans", size: 14, weight: 400, lineHeight: 1.5, letterSpacing: "0" },
  "caption.md": { fontFamily: "sans", size: 14, weight: 400, lineHeight: 1.4, letterSpacing: "0" },
  "caption.sm": { fontFamily: "sans", size: 12, weight: 400, lineHeight: 1.4, letterSpacing: "0" },
  "caption.xs": { fontFamily: "sans", size: 11, weight: 400, lineHeight: 1.3, letterSpacing: "0" },
  "code.md":    { fontFamily: "mono", size: 14, weight: 400, lineHeight: 1.5, letterSpacing: "0" },
  "code.sm":    { fontFamily: "mono", size: 12, weight: 400, lineHeight: 1.4, letterSpacing: "0" },
  "code.xs":    { fontFamily: "mono", size: 10, weight: 400, lineHeight: 1.5, letterSpacing: "0" },
  "button.md":  { fontFamily: "sans", size: 16, weight: 500, lineHeight: 1.2, letterSpacing: "0" },
  "button.sm":  { fontFamily: "sans", size: 14, weight: 500, lineHeight: 1.3, letterSpacing: "0" },
  card:         { fontFamily: "sans", size: 24, weight: 600, lineHeight: 1.3, letterSpacing: "0" },
  nav:          { fontFamily: "sans", size: 14, weight: 500, lineHeight: 1.4, letterSpacing: "0" },
  link:         { fontFamily: "sans", size: 14, weight: 400, lineHeight: 1.5, letterSpacing: "0" },
  badge:        { fontFamily: "sans", size: 12, weight: 600, lineHeight: 1.4, letterSpacing: "0.05em" },
};

// ─── Knobs ───────────────────────────────────────────────────────────────────

export type HeadingStyle = "default" | "flat" | "bold";

export interface TypographyInput {
  fontFamily?: { sans?: string; mono?: string };
  headingStyle?: HeadingStyle;
}

export interface TypographyKnobs {
  fontFamily: { sans: string | null; mono: string | null };
  headingStyle: HeadingStyle;
}

export const DEFAULT_TYPOGRAPHY_KNOBS: TypographyKnobs = {
  fontFamily: { sans: null, mono: null },
  headingStyle: "default",
};

export const HEADING_STYLE_OPTIONS: readonly HeadingStyle[] = [
  "default",
  "flat",
  "bold",
];
