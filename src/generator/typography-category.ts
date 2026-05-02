// src/generator/typography-category.ts
//
// Typography category generator (starter v1).
// Consumes schema constants from src/schema/typography.ts and emits
// per-token output for all 20 category profiles.
//
// At all defaults the output contains 49 tokens (proposal §7):
//   13 (size) + 4 (weight) + 6 (lineHeight) + 3 (letterSpacing)
//   + 3 (font chains) + 20 (profiles).

import {
  CATEGORY_PROFILES,
  FONT_FAMILY_CHAINS,
  DEFAULT_TYPOGRAPHY_KNOBS,
  HEADING_STYLE_OPTIONS,
  SIZE_SCALE,
  WEIGHT_SCALE,
  LINE_HEIGHT_SCALE,
  LETTER_SPACING_VALUES,
} from "../schema/typography.js";
import type {
  CategoryProfile,
  TypographyInput,
  TypographyKnobs,
  HeadingStyle,
} from "../schema/typography.js";

// ─── Output types ────────────────────────────────────────────────────────────

export interface TypographyToken {
  fontFamily: string;
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: string;
}

export interface TypographyCategoryTokens {
  profiles: Record<string, TypographyToken>;
  fontChains: { sans: string; mono: string; serif: string };
}

// ─── Knob resolution ─────────────────────────────────────────────────────────

export function resolveKnobs(input: TypographyInput | undefined): TypographyKnobs {
  if (!input) return { ...DEFAULT_TYPOGRAPHY_KNOBS, fontFamily: { ...DEFAULT_TYPOGRAPHY_KNOBS.fontFamily } };

  const rawSans = input.fontFamily?.sans;
  const rawMono = input.fontFamily?.mono;

  const sans =
    typeof rawSans === "string" && rawSans.trim().length > 0 ? rawSans.trim() : null;
  const mono =
    typeof rawMono === "string" && rawMono.trim().length > 0 ? rawMono.trim() : null;

  const headingStyle: HeadingStyle =
    input.headingStyle != null && (HEADING_STYLE_OPTIONS as readonly string[]).includes(input.headingStyle)
      ? input.headingStyle
      : "default";

  return { fontFamily: { sans, mono }, headingStyle };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function buildFontChain(
  slot: "sans" | "mono" | "serif",
  override: string | null,
  baseChains: { sans: string; mono: string; serif: string },
): string {
  const base = baseChains[slot];
  if (override === null) return base;

  const hasSpace = override.includes(" ");
  const formatted = hasSpace ? `"${override}"` : override;

  // Avoid duplicating if override already appears at the front of the chain.
  // Compare the raw unquoted name against the beginning of the chain string.
  const chainStart = base.trimStart();
  const alreadyFirst =
    chainStart.startsWith(`"${override}"`) || chainStart.startsWith(`${override},`) || chainStart === override;
  if (alreadyFirst) return base;

  return `${formatted}, ${base}`;
}

export function applyHeadingStyle(
  profile: CategoryProfile,
  key: string,
  style: HeadingStyle,
): CategoryProfile {
  if (style === "default" || !key.startsWith("heading.")) return profile;
  const weight = style === "flat" ? 400 : 700;
  return { ...profile, weight };
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export function generateTypographyCategory(
  input?: TypographyInput,
): TypographyCategoryTokens {
  const knobs = resolveKnobs(input);

  const fontChains = {
    sans: buildFontChain("sans", knobs.fontFamily.sans, FONT_FAMILY_CHAINS),
    mono: buildFontChain("mono", knobs.fontFamily.mono, FONT_FAMILY_CHAINS),
    serif: buildFontChain("serif", null, FONT_FAMILY_CHAINS),
  };

  const profiles: Record<string, TypographyToken> = {};
  for (const [key, profile] of Object.entries(CATEGORY_PROFILES)) {
    const resolved = applyHeadingStyle(profile, key, knobs.headingStyle);
    profiles[key] = {
      fontFamily: fontChains[resolved.fontFamily],
      size: resolved.size,
      weight: resolved.weight,
      lineHeight: resolved.lineHeight,
      letterSpacing: resolved.letterSpacing,
    };
  }

  return { profiles, fontChains };
}

// ─── Token counter ────────────────────────────────────────────────────────────

/**
 * Returns the total token count across all tiers per proposal §7:
 * 13 (size) + 4 (weight) + 6 (lineHeight) + 3 (letterSpacing) + 3 (font chains) + 20 (profiles) = 49
 */
export function countEmittedTokens(tokens: TypographyCategoryTokens): number {
  const profileCount = Object.keys(tokens.profiles).length;
  const fontChainCount = Object.keys(tokens.fontChains).length;
  const scaleCount =
    SIZE_SCALE.length +
    WEIGHT_SCALE.length +
    LINE_HEIGHT_SCALE.length +
    LETTER_SPACING_VALUES.length;
  return profileCount + fontChainCount + scaleCount;
}
