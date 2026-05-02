// src/schema/color.ts
//
// Color category schema (starter v1).
// Source of truth: docs/research/color-category-proposal.md.
// Pure spec — types, knob options, fixed constants, alias maps.
// Generation/resolution logic lives in src/generator/.

// ─── User input ─────────────────────────────────────────────────────────────

export interface ColorInput {
  /** Required. Anchors the entire accent scale and drives `text.on-primary`. */
  brandColor: string;
  /** Required iff `knobs.accent.secondary === "on"`. */
  brandColorSecondary?: string;
  /** All optional; unspecified knobs fall back to DEFAULT_COLOR_KNOBS. */
  knobs?: PartialColorKnobs;
}

export type PartialColorKnobs = {
  neutral?: Partial<ColorKnobs["neutral"]>;
  accent?: Partial<ColorKnobs["accent"]>;
  semantic?: Partial<ColorKnobs["semantic"]>;
  aliases?: Partial<ColorKnobs["aliases"]>;
};

// ─── Knob types ─────────────────────────────────────────────────────────────

export type NeutralStops = "few" | "standard" | "rich";
export type NeutralTint = "achromatic" | "cool" | "green" | "purple";
export type AccentStops = "few" | "standard" | "rich";
export type AccentSecondary = "off" | "on";
export type SemanticDepth = "minimal" | "standard" | "rich";
export type AliasesCardinality = "few" | "standard" | "rich";

export interface ColorKnobs {
  neutral: { stops: NeutralStops; tint: NeutralTint };
  accent: { stops: AccentStops; secondary: AccentSecondary };
  semantic: { depth: SemanticDepth };
  aliases: { cardinality: AliasesCardinality };
}

export const DEFAULT_COLOR_KNOBS: ColorKnobs = {
  neutral: { stops: "standard", tint: "achromatic" },
  accent: { stops: "standard", secondary: "off" },
  semantic: { depth: "standard" },
  aliases: { cardinality: "standard" },
};

// ─── Tier 1 — base palettes ─────────────────────────────────────────────────

/** Stop counts emitted for each `neutral.stops` setting (proposal §5). */
export const NEUTRAL_STOP_COUNT: Record<NeutralStops, number> = {
  few: 5,
  standard: 9,
  rich: 11,
};

/** Stop counts emitted for each `accent.stops` setting (proposal §5). */
export const ACCENT_STOP_COUNT: Record<AccentStops, number> = {
  few: 4,
  standard: 5,
  rich: 8,
};

/**
 * Lightness bounds for the neutral scale (OKLCH L).
 * Floor lifted from corpus 0.00 to 0.10 to soften default text-on-light.
 */
export const NEUTRAL_L_RANGE = { min: 0.1, max: 1.0 } as const;

/** Default neutral chroma (achromatic). Tinted neutrals use small offsets. */
export const NEUTRAL_DEFAULT_CHROMA = 0;

/**
 * Half-width of the accent lightness spread around the user-input L.
 * Corpus median primary-hue L_min/L_max ≈ 0.51/0.67 → ±0.18 anchored.
 */
export const ACCENT_L_HALF_SPREAD = 0.18;

// ─── Tier 2 — semantic palette ──────────────────────────────────────────────

export type SemanticRole = "error" | "success" | "warning" | "info";
export type SemanticPriority = "core" | "optional";
export type SemanticVariant = "background" | "text" | "border";

export interface SemanticSpec {
  role: SemanticRole;
  hue: number;
  priority: SemanticPriority;
  rationale: string;
}

/** Fixed semantic hues — independent of brand. Proposal §3. */
export const SEMANTIC_PALETTE: Record<SemanticRole, SemanticSpec> = {
  error: {
    role: "error",
    hue: 20,
    priority: "core",
    rationale: "universal validation/destructive (red)",
  },
  success: {
    role: "success",
    hue: 150,
    priority: "core",
    rationale: "universal confirmation (green)",
  },
  warning: {
    role: "warning",
    hue: 70,
    priority: "core",
    rationale: "universal attention (yellow/orange)",
  },
  info: {
    role: "info",
    hue: 230,
    priority: "optional",
    rationale: "informational (blue); accepts overlap with blue brands",
  },
};

/**
 * Variants emitted per semantic role at each `semantic.depth` setting.
 * - minimal: bg only, info dropped
 * - standard: bg + text for all 4 roles
 * - rich: bg + text + border for all 4 roles
 */
export const SEMANTIC_DEPTH_VARIANTS: Record<SemanticDepth, readonly SemanticVariant[]> = {
  minimal: ["background"],
  standard: ["background", "text"],
  rich: ["background", "text", "border"],
};

/** Whether `info` is emitted at this depth. */
export const SEMANTIC_DEPTH_INCLUDES_INFO: Record<SemanticDepth, boolean> = {
  minimal: false,
  standard: true,
  rich: true,
};

// ─── Tier 3 — role aliases ──────────────────────────────────────────────────

/** Reference into a Tier 1 scale, e.g. "neutral.50" or "accent.contrast". */
export type AliasReference = string;

export type SurfaceTokenStandard =
  | "canvas"
  | "soft"
  | "strong"
  | "card"
  | "hairline";

export type TextTokenStandard =
  | "ink"
  | "body"
  | "body-strong"
  | "muted"
  | "muted-soft"
  | "on-primary";

/** Standard surface aliases (5). Proposal §4. */
export const SURFACE_ALIASES_STANDARD: Record<SurfaceTokenStandard, AliasReference> = {
  canvas: "neutral.50",
  soft: "neutral.100",
  strong: "neutral.200",
  card: "neutral.50",
  hairline: "neutral.300",
};

/** Standard text aliases (6). Proposal §4. `on-primary` resolves to accent contrast. */
export const TEXT_ALIASES_STANDARD: Record<TextTokenStandard, AliasReference> = {
  ink: "neutral.900",
  body: "neutral.800",
  "body-strong": "neutral.900",
  muted: "neutral.600",
  "muted-soft": "neutral.500",
  "on-primary": "accent.contrast",
};

/**
 * Alias counts per `aliases.cardinality` knob (proposal §5).
 * Standard mapping is fully enumerated above; few/rich subsetting is
 * derived in the generator (Step D).
 */
export const ALIAS_CARDINALITY: Record<
  AliasesCardinality,
  { surface: number; text: number }
> = {
  few: { surface: 3, text: 4 },
  standard: { surface: 5, text: 6 },
  rich: { surface: 8, text: 7 },
};

// ─── Knob option enumerations (for UI / validation) ─────────────────────────

export const NEUTRAL_STOPS_OPTIONS: readonly NeutralStops[] = ["few", "standard", "rich"];
export const NEUTRAL_TINT_OPTIONS: readonly NeutralTint[] = [
  "achromatic",
  "cool",
  "green",
  "purple",
];
export const ACCENT_STOPS_OPTIONS: readonly AccentStops[] = ["few", "standard", "rich"];
export const ACCENT_SECONDARY_OPTIONS: readonly AccentSecondary[] = ["off", "on"];
export const SEMANTIC_DEPTH_OPTIONS: readonly SemanticDepth[] = [
  "minimal",
  "standard",
  "rich",
];
export const ALIASES_CARDINALITY_OPTIONS: readonly AliasesCardinality[] = [
  "few",
  "standard",
  "rich",
];
