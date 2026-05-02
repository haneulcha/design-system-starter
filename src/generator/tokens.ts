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
 * Builds the flat semantic alias map from the new color category output.
 * Token names follow the proposal §4 vocabulary plus a small set of
 * accent/status conveniences for component generation.
 */
export function generateSemantic(colorTokens: ColorCategoryTokens): SemanticTokens {
  const includesInfo = colorTokens.semantic.info !== undefined;
  const hasSecondary = colorTokens.accentSecondary !== undefined;

  return {
    // ── Surface aliases (proposal §4) ──────────────────────────────────────
    "bg/canvas": "neutral-50",
    "bg/soft": "neutral-100",
    "bg/strong": "neutral-200",
    "bg/card": "neutral-50",
    "bg/hairline": "neutral-300",

    // ── Text aliases (proposal §4) ─────────────────────────────────────────
    "text/ink": "neutral-900",
    "text/body": "neutral-800",
    "text/body-strong": "neutral-900",
    "text/muted": "neutral-600",
    "text/muted-soft": "neutral-500",
    "text/on-primary": "accent-contrast",

    // ── Accent role aliases (component-facing) ─────────────────────────────
    "accent/primary": "accent-500",
    "accent/hover": "accent-300",
    "accent/active": "accent-700",
    "accent/strong": "accent-900",
    ...(hasSecondary
      ? {
          "accent/secondary": "accent2-500",
          "accent/secondary-hover": "accent2-300",
        }
      : {}),

    // ── Semantic palette refs (proposal §3) ────────────────────────────────
    "status/error-bg": "error-background",
    "status/error-text": "error-text",
    "status/success-bg": "success-background",
    "status/success-text": "success-text",
    "status/warning-bg": "warning-background",
    "status/warning-text": "warning-text",
    ...(includesInfo
      ? {
          "status/info-bg": "info-background",
          "status/info-text": "info-text",
        }
      : {}),
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
  const spacing: Record<string, number> = {};
  for (const s of system.layout.spacing) {
    spacing[s.name] = parsePx(s.value);
  }

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
    if (lvl.shadow === "none") continue;
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
    elevation,
    breakpoint,
  };
}
