// src/schema/components.ts
//
// Component category schema (starter v1).
// Source of truth: docs/research/component-category-proposal.md.
// Pure spec — types, knob options, fixed constants, per-primitive size maps.
// Generation/resolution logic lives in src/generator/components-category.ts.
//
// Components is a CONSUMER category — every leaf value is a token-ref string
// (e.g. "spacing.xxl", "radius.button", "typography.body-md", "elevation.raised").
// No own scale; resolution happens at downstream consumer time.

// ─── Primitives ─────────────────────────────────────────────────────────────

export type ComponentPrimitive =
  | "button"
  | "input"
  | "card"
  | "badge"
  | "tab"
  | "avatar";

export const PRIMITIVE_NAMES: readonly ComponentPrimitive[] = [
  "button",
  "input",
  "card",
  "badge",
  "tab",
  "avatar",
] as const;

// ─── Variant taxonomies (per primitive) ─────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "text" | "icon";
export type InputVariant = "text" | "search" | "textarea";
export type CardVariant = "default" | "outlined" | "elevated" | "filled";
export type BadgeVariant = "subtle" | "solid";
export type TabVariant = "underline" | "pill";
export type AvatarVariant = "circle";

export const BUTTON_VARIANTS: readonly ButtonVariant[] = ["primary", "secondary", "ghost", "outline", "text", "icon"];
export const INPUT_VARIANTS:  readonly InputVariant[]  = ["text", "search", "textarea"];
export const CARD_VARIANTS:   readonly CardVariant[]   = ["default", "outlined", "elevated", "filled"];
export const BADGE_VARIANTS:  readonly BadgeVariant[]  = ["subtle", "solid"];
export const TAB_VARIANTS:    readonly TabVariant[]    = ["underline", "pill"];
export const AVATAR_VARIANTS: readonly AvatarVariant[] = ["circle"];

// ─── State taxonomies (per primitive) ───────────────────────────────────────
//
// Cards and avatars have no states (proposal §3.2, §3.6 — corpus shows zero
// systems define hover/active card states).

export type ButtonState = "default" | "hover" | "active" | "disabled" | "focus";
export type InputState  = "default" | "hover" | "focus" | "disabled" | "error";
export type TabState    = "default" | "active" | "disabled";

export const BUTTON_STATES: readonly ButtonState[] = ["default", "hover", "active", "disabled", "focus"];
export const INPUT_STATES:  readonly InputState[]  = ["default", "hover", "focus", "disabled", "error"];
export const TAB_STATES:    readonly TabState[]    = ["default", "active", "disabled"];

// ─── Size taxonomies (per primitive) ────────────────────────────────────────

export type ButtonSize = "sm" | "md" | "lg";
export type InputSize  = "sm" | "md" | "lg";
export type CardSize   = "sm" | "md" | "lg";
export type BadgeSize  = "sm" | "md";
export type TabSize    = "sm" | "md";
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export const BUTTON_SIZES: readonly ButtonSize[] = ["sm", "md", "lg"];
export const INPUT_SIZES:  readonly InputSize[]  = ["sm", "md", "lg"];
export const CARD_SIZES:   readonly CardSize[]   = ["sm", "md", "lg"];
export const BADGE_SIZES:  readonly BadgeSize[]  = ["sm", "md"];
export const TAB_SIZES:    readonly TabSize[]    = ["sm", "md"];
export const AVATAR_SIZES: readonly AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];

// ─── Per-size structural alias maps (proposal §3) ───────────────────────────
//
// Every value is a token-ref string. The format is "<category>.<key>". The
// component category does not resolve these strings — they pass through to
// consumers (template renderer, figma transformer, tokens.ts).

export interface ButtonSizeSpec {
  height: string;    // spacing alias
  paddingX: string;  // spacing alias
  gap: string;       // spacing alias
  fontSize: string;  // typography token
  iconSize: string;  // spacing alias
  radius: string;    // radius token (knob-resolved)
}

export const BUTTON_SIZE_SPECS: Record<ButtonSize, ButtonSizeSpec> = {
  sm: { height: "spacing.xl",  paddingX: "spacing.sm", gap: "spacing.xxs", fontSize: "typography.caption-md", iconSize: "spacing.md", radius: "radius.button" },
  md: { height: "spacing.xxl", paddingX: "spacing.md", gap: "spacing.xs",  fontSize: "typography.button-md",  iconSize: "spacing.md", radius: "radius.button" },
  lg: { height: "spacing.xxl", paddingX: "spacing.lg", gap: "spacing.xs",  fontSize: "typography.body-md",    iconSize: "spacing.lg", radius: "radius.button" },
};

export interface InputSizeSpec {
  height: string;
  paddingX: string;
  radius: string;
  labelFont: string;
  valueFont: string;
  helperFont: string;
}

export const INPUT_SIZE_SPECS: Record<InputSize, InputSizeSpec> = {
  sm: { height: "spacing.xl",  paddingX: "spacing.sm", radius: "radius.input", labelFont: "typography.caption-md", valueFont: "typography.body-sm", helperFont: "typography.caption-sm" },
  md: { height: "spacing.xxl", paddingX: "spacing.sm", radius: "radius.input", labelFont: "typography.caption-md", valueFont: "typography.body-md", helperFont: "typography.caption-sm" },
  lg: { height: "spacing.xxl", paddingX: "spacing.md", radius: "radius.input", labelFont: "typography.caption-md", valueFont: "typography.body-md", helperFont: "typography.caption-sm" },
};

export interface CardSizeSpec {
  radius: string;
  contentPadding: string;
  contentGap: string;
  /** Used only when variant=elevated (proposal §3.2). lg cards earn floating. */
  elevatedShadow: string;
  headerFont: string;
  bodyFont: string;
}

export const CARD_SIZE_SPECS: Record<CardSize, CardSizeSpec> = {
  sm: { radius: "radius.card", contentPadding: "spacing.md", contentGap: "spacing.xs", elevatedShadow: "elevation.raised",   headerFont: "typography.card-md",    bodyFont: "typography.body-sm" },
  md: { radius: "radius.card", contentPadding: "spacing.lg", contentGap: "spacing.sm", elevatedShadow: "elevation.raised",   headerFont: "typography.card-md",    bodyFont: "typography.body-md" },
  lg: { radius: "radius.card", contentPadding: "spacing.xl", contentGap: "spacing.md", elevatedShadow: "elevation.floating", headerFont: "typography.heading-md", bodyFont: "typography.body-md" },
};

export interface BadgeSizeSpec {
  height: string;
  paddingX: string;
  /** Knob-resolved at generation time (radius.pill or radius.subtle). */
  radius: string;
  font: string;
}

export const BADGE_SIZE_SPECS: Record<BadgeSize, Omit<BadgeSizeSpec, "radius">> = {
  sm: { height: "spacing.lg", paddingX: "spacing.xs", font: "typography.badge-md" },
  md: { height: "spacing.xl", paddingX: "spacing.sm", font: "typography.caption-md" },
};

export interface TabSizeSpec {
  height: string;
  paddingX: string;
  gap: string;
  font: string;
}

export const TAB_SIZE_SPECS: Record<TabSize, TabSizeSpec> = {
  sm: { height: "spacing.lg", paddingX: "spacing.sm", gap: "spacing.xs", font: "typography.caption-md" },
  md: { height: "spacing.xl", paddingX: "spacing.md", gap: "spacing.sm", font: "typography.button-md" },
};

export interface AvatarSizeSpec {
  /** Width and height (avatars are always square). Spacing alias. */
  dimension: string;
}

export const AVATAR_SIZE_SPECS: Record<AvatarSize, AvatarSizeSpec> = {
  xs: { dimension: "spacing.md" },
  sm: { dimension: "spacing.lg" },
  md: { dimension: "spacing.xl" },
  lg: { dimension: "spacing.xxl" },
  xl: { dimension: "spacing.section" },
};

// ─── Knobs ──────────────────────────────────────────────────────────────────

export type CardSurface = "outlined" | "elevated" | "filled";
export type ButtonShape = "rect" | "pill";

export const CARD_SURFACE_OPTIONS: readonly CardSurface[] = ["outlined", "elevated", "filled"];
export const BUTTON_SHAPE_OPTIONS: readonly ButtonShape[] = ["rect", "pill"];

export interface ComponentInput {
  cardSurface?: CardSurface;
  buttonShape?: ButtonShape;
}

export interface ComponentKnobs {
  cardSurface: CardSurface;
  buttonShape: ButtonShape;
}

export const DEFAULT_COMPONENT_KNOBS: ComponentKnobs = {
  cardSurface: "outlined",
  buttonShape: "rect",
};
