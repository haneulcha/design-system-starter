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
 * Builds the flat semantic alias map from the palette-driven color category.
 * Each semantic name maps to a palette slot via "palette/<slot>" refs;
 * resolveOklch parses on the first "/" so slot names with hyphens
 * (e.g. "error-bg") resolve unambiguously.
 *
 * Hover/active/strong accent variants all alias the single accent slot
 * for v1 — the corpus model is "one brand color, full stop". Future tonal
 * variants can be derived in CSS via color-mix().
 */
export function generateSemantic(_colorTokens: ColorCategoryTokens): SemanticTokens {
  return {
    // Surface
    "bg/canvas":   "palette/canvas",
    "bg/soft":     "palette/soft",
    "bg/strong":   "palette/soft",     // collapsed — palette has no "strong" slot
    "bg/card":     "palette/canvas",
    "bg/hairline": "palette/hairline",

    // Text
    "text/ink":          "palette/ink",
    "text/body":         "palette/body",
    "text/body-strong":  "palette/ink",
    "text/muted":        "palette/muted",
    "text/muted-soft":   "palette/muted",
    "text/on-primary":   "palette/canvas",  // assume light text on the brand accent

    // Accent
    "accent/primary": "palette/accent",
    "accent/hover":   "palette/accent",
    "accent/active":  "palette/accent",
    "accent/strong":  "palette/accent",

    // Status
    "status/error-bg":     "palette/error-bg",
    "status/error-text":   "palette/error-text",
    "status/success-bg":   "palette/success-bg",
    "status/success-text": "palette/success-text",
    "status/warning-bg":   "palette/warning-bg",
    "status/warning-text": "palette/warning-text",
    "status/info-bg":      "palette/info-bg",
    "status/info-text":    "palette/info-text",
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
