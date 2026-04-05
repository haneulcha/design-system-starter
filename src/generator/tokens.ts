// src/generator/tokens.ts

import type {
  DesignSystem,
  DesignTokens,
  PrimitiveTokens,
  SemanticTokens,
  ComponentTokens,
} from "../schema/types.js";
import type { ColorScales } from "./color.js";

function kebab(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

function parsePx(s: string): number {
  const match = s.match(/^(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 0;
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

export function generateSemantic(
  primitive: PrimitiveTokens,
): SemanticTokens {
  return {
    // Background
    "bg/base": "gray-100",
    "bg/subtle": "gray-200",
    "bg/muted": "gray-300",

    // Text
    "text/primary": "gray-1000",
    "text/secondary": "gray-900",
    "text/muted": "gray-700",
    "text/disabled": "gray-500",

    // Border
    "border/default": "gray-400",
    "border/subtle": "gray-300",
    "border/strong": "gray-600",

    // Brand (always "brand" role, anchor at 700)
    "brand/primary": "brand-700",
    "brand/secondary": "brand-800",
    "brand/subtle": "brand-200",
    "brand/muted": "brand-100",

    // Accent (always "accent" role)
    ...(primitive.colors["accent"] ? {
      "accent/primary": "accent-700",
      "accent/subtle": "accent-200",
    } : {}),

    // Status
    "status/success": "green-700",
    "status/success-subtle": "green-200",
    "status/success-text": "green-900",
    "status/error": "red-700",
    "status/error-subtle": "red-200",
    "status/error-text": "red-900",
    "status/warning": "amber-700",
    "status/warning-subtle": "amber-200",
    "status/warning-text": "amber-900",
    "status/info": "blue-700",
    "status/info-subtle": "blue-200",
    "status/info-text": "blue-900",

    // Constants
    "white": "gray-100",
    "black": "gray-1000",
  };
}

// ─── Layer 3: Component ───────────────────────────────────────────────────────

export function generateComponent(_semantic: SemanticTokens): ComponentTokens {
  return {
    button: {
      primary: {
        bg: "brand/primary",
        bgHover: "brand/secondary",
        bgDisabled: "bg/muted",
        text: "white",
        textDisabled: "text/disabled",
      },
      secondary: {
        bg: "bg/subtle",
        bgHover: "bg/muted",
        bgDisabled: "bg/subtle",
        text: "text/primary",
        textDisabled: "text/disabled",
      },
      ghost: {
        bg: "transparent",
        bgHover: "bg/subtle",
        bgDisabled: "transparent",
        text: "brand/primary",
        textDisabled: "text/disabled",
        border: "border/default",
        borderDisabled: "border/subtle",
      },
    },
    input: {
      default: {
        bg: "bg/base",
        border: "border/default",
        text: "text/primary",
        placeholder: "text/muted",
        label: "text/primary",
        helper: "text/secondary",
      },
      focus: {
        border: "brand/primary",
      },
      error: {
        border: "status/error",
        errorText: "status/error-text",
      },
      disabled: {
        bg: "bg/muted",
        border: "border/subtle",
      },
    },
    card: {
      default: {
        bg: "bg/subtle",
        border: "border/subtle",
        headerText: "text/primary",
        bodyText: "text/secondary",
      },
    },
    badge: {
      default: {
        bg: "bg/muted",
        text: "text/secondary",
      },
      success: {
        bg: "status/success-subtle",
        text: "status/success-text",
      },
      error: {
        bg: "status/error-subtle",
        text: "status/error-text",
      },
      warning: {
        bg: "status/warning-subtle",
        text: "status/warning-text",
      },
      info: {
        bg: "status/info-subtle",
        text: "status/info-text",
      },
    },
    divider: {
      default: {
        line: "border/subtle",
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
  component: ComponentTokens
): DesignTokens {
  const brand = { name: system.brandName, mood: system.mood };

  // ── typography ──────────────────────────────────────────────────────────────
  const families: Record<string, string> = {
    primary: system.typography.families.primary,
    primaryFallback: system.typography.families.primaryFallback,
    mono: system.typography.families.mono,
    monoFallback: system.typography.families.monoFallback,
  };

  const styles: DesignTokens["typography"]["styles"] = {};
  for (const t of system.typography.hierarchy) {
    const key = kebab(t.role);
    const fontSize = parsePx(t.size);
    const lineHeightRaw = parseFloat(t.lineHeight);
    const lineHeight = isNaN(lineHeightRaw) ? 1.5 : lineHeightRaw;
    let letterSpacing: number;
    if (t.letterSpacing === "normal" || t.letterSpacing === "0.04em") {
      letterSpacing = 0;
    } else {
      const parsed = parseFloat(t.letterSpacing);
      letterSpacing = isNaN(parsed) ? 0 : parsed;
    }
    styles[key] = {
      fontFamily: t.font,
      fontSize,
      fontWeight: t.weight,
      lineHeight,
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
