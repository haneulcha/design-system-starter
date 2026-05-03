// src/generator/tokens.ts

import type {
  DesignSystem,
  DesignTokens,
  PrimitiveTokens,
  SemanticTokens,
  ComponentTokens,
} from "../schema/types.js";
import type { ColorScales } from "./color.js";
import type { ColorCategoryTokens } from "./color-category.js";
import {
  ARCHETYPE_PALETTES,
  STATUS_HUE_NAMES,
} from "../schema/archetype-palettes.js";

function kebab(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

function parsePx(s: string): number {
  const match = s.match(/^(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Converts the schema's letter-spacing string values to a number (em units).
 * - "0"       → 0
 * - "-0.02em" → -0.02
 * - "0.05em"  → 0.05
 * Throws if the string cannot be parsed — this is internal data, not user input.
 */
function parseLetterSpacingEm(s: string): number {
  const stripped = s.endsWith("em") ? s.slice(0, -2) : s;
  const value = parseFloat(stripped);
  if (isNaN(value)) {
    throw new Error(`parseLetterSpacingEm: cannot parse "${s}"`);
  }
  return value;
}

// ─── Layer 1: Primitive ───────────────────────────────────────────────────────

export function generatePrimitive(scales: ColorScales): PrimitiveTokens {
  const colors: PrimitiveTokens["colors"] = {};
  for (const [hue, scale] of Object.entries(scales)) {
    colors[hue] = {};
    for (const [step, values] of Object.entries(scale)) {
      colors[hue][step] = values; // { light, dark }
    }
  }
  return { colors };
}

// ─── Layer 2: Semantic ────────────────────────────────────────────────────────

/**
 * Builds the flat semantic alias map. Each value is a "<hue>/<stop>" ref into
 * the primitive layer (see generatePrimitive). Surface/text refs follow the
 * archetype palette's surfaceRefs/textRefs (per-archetype overrides cascade);
 * status refs map through STATUS_HUE_NAMES (error → red, success → green,
 * warning → amber, info → blue).
 *
 * Hover/active/strong accent variants alias the single accent stop for v1 —
 * the corpus model is "one brand color, full stop". Future tonal variants
 * can be derived in CSS via color-mix().
 */
export function generateSemantic(colorTokens: ColorCategoryTokens): SemanticTokens {
  const arche = ARCHETYPE_PALETTES[colorTokens.preset];
  const surfaceRefs = arche.surfaceRefs;
  const textRefs = arche.textRefs;

  return {
    // Surface
    "bg/canvas":   `neutral/${surfaceRefs.canvas}`,
    "bg/soft":     `neutral/${surfaceRefs.soft}`,
    "bg/strong":   `neutral/${surfaceRefs.soft}`,    // collapsed — no "strong" slot
    "bg/card":     `neutral/${surfaceRefs.canvas}`,
    "bg/hairline": `neutral/${surfaceRefs.hairline}`,

    // Text
    "text/ink":         `neutral/${textRefs.ink}`,
    "text/body":        `neutral/${textRefs.body}`,
    "text/body-strong": `neutral/${textRefs.ink}`,
    "text/muted":       `neutral/${textRefs.muted}`,
    "text/muted-soft":  `neutral/${textRefs.muted}`,
    "text/on-primary":  `neutral/${surfaceRefs.canvas}`,  // light text on accent

    // Accent
    "accent/primary": "accent/500",
    "accent/hover":   "accent/500",
    "accent/active":  "accent/500",
    "accent/strong":  "accent/500",

    // Status
    "status/error-bg":     `${STATUS_HUE_NAMES.error}/50`,
    "status/error-text":   `${STATUS_HUE_NAMES.error}/500`,
    "status/success-bg":   `${STATUS_HUE_NAMES.success}/50`,
    "status/success-text": `${STATUS_HUE_NAMES.success}/500`,
    "status/warning-bg":   `${STATUS_HUE_NAMES.warning}/50`,
    "status/warning-text": `${STATUS_HUE_NAMES.warning}/500`,
    "status/info-bg":      `${STATUS_HUE_NAMES.info}/50`,
    "status/info-text":    `${STATUS_HUE_NAMES.info}/500`,
  };
}

// ─── Layer 3: Component ───────────────────────────────────────────────────────

export function generateComponent(_semantic: SemanticTokens): ComponentTokens {
  const includesInfo = "status/info-bg" in _semantic;

  return {
    button: {
      primary: {
        bg: "accent/primary",
        bgHover: "accent/hover",
        bgDisabled: "bg/strong",
        text: "text/on-primary",
        textDisabled: "text/muted",
      },
      secondary: {
        bg: "bg/soft",
        bgHover: "bg/strong",
        bgDisabled: "bg/soft",
        text: "text/body",
        textDisabled: "text/muted",
      },
      ghost: {
        bg: "transparent",
        bgHover: "bg/soft",
        bgDisabled: "transparent",
        text: "accent/primary",
        textDisabled: "text/muted",
        border: "bg/hairline",
        borderDisabled: "bg/hairline",
      },
    },
    input: {
      default: {
        bg: "bg/canvas",
        border: "bg/hairline",
        text: "text/body",
        placeholder: "text/muted",
        label: "text/body",
        helper: "text/muted-soft",
      },
      focus: {
        border: "accent/primary",
      },
      error: {
        border: "status/error-text",
        errorText: "status/error-text",
      },
      disabled: {
        bg: "bg/strong",
        border: "bg/hairline",
      },
    },
    card: {
      default: {
        bg: "bg/card",
        border: "bg/hairline",
        headerText: "text/ink",
        bodyText: "text/body",
      },
    },
    badge: {
      default: {
        bg: "bg/strong",
        text: "text/body",
      },
      success: {
        bg: "status/success-bg",
        text: "status/success-text",
      },
      error: {
        bg: "status/error-bg",
        text: "status/error-text",
      },
      warning: {
        bg: "status/warning-bg",
        text: "status/warning-text",
      },
      ...(includesInfo
        ? {
            info: {
              bg: "status/info-bg",
              text: "status/info-text",
            },
          }
        : {}),
    },
    divider: {
      default: {
        line: "bg/hairline",
        labelText: "text/muted",
      },
    },
  };
}

// ─── Convenience: buildDesignTokens ──────────────────────────────────────────

export function buildDesignTokens(
  system: DesignSystem,
  primitive: PrimitiveTokens,
  semantic: SemanticTokens,
  component: ComponentTokens,
): DesignTokens {
  const brand = { name: system.brandName };

  // ── typography ──────────────────────────────────────────────────────────────
  const { profiles, fontChains } = system.typographyTokens;

  const families: Record<string, string> = {
    sans: fontChains.sans,
    mono: fontChains.mono,
    serif: fontChains.serif,
  };

  const styles: DesignTokens["typography"]["styles"] = {};
  for (const [profileKey, t] of Object.entries(profiles)) {
    const key = profileKey.replace(/\./g, "-"); // "heading.xl" → "heading-xl", "card" → "card"
    const letterSpacing = parseLetterSpacingEm(t.letterSpacing);
    styles[key] = {
      fontFamily: t.fontFamily,
      fontSize: t.size,
      fontWeight: t.weight,
      lineHeight: t.lineHeight,
      letterSpacing,
    };
  }

  // ── spacing ─────────────────────────────────────────────────────────────────
  // Read directly from spacingTokens (proposal §3) — emits the 8 aliases.
  // Reserved scale stops (2, 20, 64, 80) stay accessible via SCALE constant.
  const spacing: Record<string, number> = { ...system.spacingTokens.aliases };

  // ── borderRadius ────────────────────────────────────────────────────────────
  const borderRadius: Record<string, number> = {};
  for (const r of system.layout.borderRadius) {
    const key = kebab(r.name);
    if (r.value === "50%") {
      borderRadius[key] = -1;
    } else if (r.value === "9999px") {
      borderRadius[key] = 9999;
    } else {
      borderRadius[key] = parsePx(r.value);
    }
  }

  // ── elevation ───────────────────────────────────────────────────────────────
  const elevation: Record<string, string> = {};
  for (const lvl of system.elevation.levels) {
    elevation[kebab(lvl.name)] = lvl.shadow;
  }

  // ── breakpoint ──────────────────────────────────────────────────────────────
  const breakpoint: Record<string, number> = {};
  for (const bp of system.responsive.breakpoints) {
    breakpoint[kebab(bp.name)] = parsePx(bp.minWidth);
  }

  return {
    brand,
    primitive,
    semantic,
    component,
    typography: { families, styles },
    spacing,
    borderRadius,
    radiusPrimitives: system.radiusTokens.scale,
    elevation,
    breakpoint,
  };
}
