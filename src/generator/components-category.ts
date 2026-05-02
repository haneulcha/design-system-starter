// src/generator/components-category.ts
//
// Component category generator (starter v1).
// Consumes schema constants from src/schema/components.ts and emits the
// resolved per-primitive token tree.
//
// Components is a CONSUMER category — every leaf value is a token-ref string.
// Resolution to actual numeric/CSS values happens at downstream consumer time
// (template renderer, figma transformer, tokens.ts).

import {
  BUTTON_VARIANTS, INPUT_VARIANTS, CARD_VARIANTS, BADGE_VARIANTS, TAB_VARIANTS, AVATAR_VARIANTS,
  BUTTON_STATES, INPUT_STATES, TAB_STATES,
  BUTTON_SIZES, INPUT_SIZES, CARD_SIZES, BADGE_SIZES, TAB_SIZES, AVATAR_SIZES,
  BUTTON_SIZE_SPECS, INPUT_SIZE_SPECS, CARD_SIZE_SPECS, BADGE_SIZE_SPECS, TAB_SIZE_SPECS, AVATAR_SIZE_SPECS,
  CARD_SURFACE_OPTIONS, BUTTON_SHAPE_OPTIONS,
  DEFAULT_COMPONENT_KNOBS,
  type ComponentInput, type ComponentKnobs,
  type ButtonShape, type CardSurface,
  type ButtonSize, type InputSize, type CardSize, type BadgeSize, type TabSize, type AvatarSize,
  type ButtonVariant, type InputVariant, type CardVariant, type BadgeVariant, type TabVariant, type AvatarVariant,
  type ButtonState, type InputState, type TabState,
  type ButtonSizeSpec, type InputSizeSpec, type CardSizeSpec, type BadgeSizeSpec, type TabSizeSpec, type AvatarSizeSpec,
} from "../schema/components.js";

// ─── Output types ───────────────────────────────────────────────────────────

export interface ButtonTokens {
  variants: readonly ButtonVariant[];
  states: readonly ButtonState[];
  sizes: Record<ButtonSize, ButtonSizeSpec>;
}

export interface InputTokens {
  variants: readonly InputVariant[];
  states: readonly InputState[];
  sizes: Record<InputSize, InputSizeSpec>;
}

export interface CardTokens {
  variants: readonly CardVariant[];
  /** Cards have no states (proposal §3.2). */
  states: readonly never[];
  sizes: Record<CardSize, CardSizeSpec>;
  /** Default variant resolved by the cardSurface knob. */
  defaultVariant: CardVariant;
}

export interface BadgeTokens {
  variants: readonly BadgeVariant[];
  states: readonly never[];
  sizes: Record<BadgeSize, BadgeSizeSpec>;
}

export interface TabTokens {
  variants: readonly TabVariant[];
  states: readonly TabState[];
  sizes: Record<TabSize, TabSizeSpec>;
}

export interface AvatarTokens {
  variants: readonly AvatarVariant[];
  states: readonly never[];
  sizes: Record<AvatarSize, AvatarSizeSpec>;
  /** Avatars are always circular per proposal §3.6. */
  radius: string;
}

export interface ComponentCategoryTokens {
  button: ButtonTokens;
  input: InputTokens;
  card: CardTokens;
  badge: BadgeTokens;
  tab: TabTokens;
  avatar: AvatarTokens;
  knobs: ComponentKnobs;
  philosophy: string;
}

// ─── Knob resolution ────────────────────────────────────────────────────────

export function resolveKnobs(input: ComponentInput | undefined): ComponentKnobs {
  if (!input) return { ...DEFAULT_COMPONENT_KNOBS };

  const cardSurface: CardSurface =
    input.cardSurface != null && (CARD_SURFACE_OPTIONS as readonly string[]).includes(input.cardSurface)
      ? input.cardSurface
      : DEFAULT_COMPONENT_KNOBS.cardSurface;

  const buttonShape: ButtonShape =
    input.buttonShape != null && (BUTTON_SHAPE_OPTIONS as readonly string[]).includes(input.buttonShape)
      ? input.buttonShape
      : DEFAULT_COMPONENT_KNOBS.buttonShape;

  return { cardSurface, buttonShape };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Resolve the radius alias used for buttons given the shape knob. */
export function buildButtonRadius(shape: ButtonShape): string {
  return shape === "pill" ? "radius.pill" : "radius.button";
}

/** Resolve the radius alias used for badges. Per the badge–button correlation
 *  rule (proposal §5), badges follow buttonShape. */
export function buildBadgeRadius(shape: ButtonShape): string {
  return shape === "pill" ? "radius.pill" : "radius.subtle";
}

/** A short philosophy string describing the chosen knob combination. */
export function buildPhilosophy(knobs: ComponentKnobs): string {
  const surfaceWord = {
    outlined: "Outlined cards",
    elevated: "Elevated cards",
    filled: "Filled cards",
  }[knobs.cardSurface];
  const shapeWord = knobs.buttonShape === "pill" ? "pill-shaped buttons" : "rectangular buttons";
  return `${surfaceWord} on ${shapeWord}.`;
}

// ─── Per-primitive builders ─────────────────────────────────────────────────

function buildButton(knobs: ComponentKnobs): ButtonTokens {
  const radius = buildButtonRadius(knobs.buttonShape);
  const sizes: Record<ButtonSize, ButtonSizeSpec> = {
    sm: { ...BUTTON_SIZE_SPECS.sm, radius },
    md: { ...BUTTON_SIZE_SPECS.md, radius },
    lg: { ...BUTTON_SIZE_SPECS.lg, radius },
  };
  return { variants: BUTTON_VARIANTS, states: BUTTON_STATES, sizes };
}

function buildInput(): InputTokens {
  return { variants: INPUT_VARIANTS, states: INPUT_STATES, sizes: { ...INPUT_SIZE_SPECS } };
}

function buildCard(knobs: ComponentKnobs): CardTokens {
  // cardSurface knob picks the variant a consumer gets when they ask for the
  // "default card." The full variant set stays available via explicit ref.
  const defaultVariant: CardVariant = knobs.cardSurface;
  return {
    variants: CARD_VARIANTS,
    states: [] as const,
    sizes: { ...CARD_SIZE_SPECS },
    defaultVariant,
  };
}

function buildBadge(knobs: ComponentKnobs): BadgeTokens {
  const radius = buildBadgeRadius(knobs.buttonShape);
  const sizes: Record<BadgeSize, BadgeSizeSpec> = {
    sm: { ...BADGE_SIZE_SPECS.sm, radius },
    md: { ...BADGE_SIZE_SPECS.md, radius },
  };
  return { variants: BADGE_VARIANTS, states: [] as const, sizes };
}

function buildTab(): TabTokens {
  return { variants: TAB_VARIANTS, states: TAB_STATES, sizes: { ...TAB_SIZE_SPECS } };
}

function buildAvatar(): AvatarTokens {
  return {
    variants: AVATAR_VARIANTS,
    states: [] as const,
    sizes: { ...AVATAR_SIZE_SPECS },
    radius: "radius.circle",
  };
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export function generateComponentCategory(
  input?: ComponentInput,
): ComponentCategoryTokens {
  const knobs = resolveKnobs(input);
  return {
    button: buildButton(knobs),
    input: buildInput(),
    card: buildCard(knobs),
    badge: buildBadge(knobs),
    tab: buildTab(),
    avatar: buildAvatar(),
    knobs,
    philosophy: buildPhilosophy(knobs),
  };
}

// ─── Token counter ──────────────────────────────────────────────────────────

/** Returns the total leaf-token-ref count emitted, useful for proposal §7
 *  output-count verification. */
export function countEmittedRefs(tokens: ComponentCategoryTokens): number {
  let count = 0;
  for (const spec of Object.values(tokens.button.sizes)) count += Object.keys(spec).length;
  for (const spec of Object.values(tokens.input.sizes))  count += Object.keys(spec).length;
  for (const spec of Object.values(tokens.card.sizes))   count += Object.keys(spec).length;
  for (const spec of Object.values(tokens.badge.sizes))  count += Object.keys(spec).length;
  for (const spec of Object.values(tokens.tab.sizes))    count += Object.keys(spec).length;
  for (const spec of Object.values(tokens.avatar.sizes)) count += Object.keys(spec).length;
  count += 1; // avatar.radius
  return count;
}
