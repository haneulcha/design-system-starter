// src/generator/tokens.ts

import { formatHex, converter, parse } from "culori";
import type {
  ColorPalette,
  DesignSystem,
  DesignTokens,
  PrimitiveTokens,
  SemanticTokens,
  ComponentTokens,
} from "../schema/types.js";
import type { ArchetypePreset } from "../schema/types.js";
import { detectHueName } from "./color.js";

const toOklch = converter("oklch");

function oklchToHex(l: number, c: number, h: number): string {
  const hex = formatHex({ mode: "oklch", l, c, h });
  return hex ?? "#000000";
}

function kebab(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

function parsePx(s: string): number {
  const match = s.match(/^(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 0;
}

// ─── Layer 1: Primitive ───────────────────────────────────────────────────────

export function generatePrimitive(
  palette: ColorPalette,
  primaryHex: string
): PrimitiveTokens {
  const base = toOklch(primaryHex);
  if (!base) throw new Error(`Invalid hex color: ${primaryHex}`);
  const primaryHue = base.h ?? 0;

  const brandHue = detectHueName(primaryHue);

  const accentHue = (primaryHue + 150) % 360;
  const accentHueName = detectHueName(accentHue);

  const colors: Record<string, string> = {};

  // Brand: primary[0..2] → {brandHue}500/700/200
  colors[`${brandHue}500`] = palette.primary[0].hex;
  colors[`${brandHue}700`] = palette.primary[1].hex;
  colors[`${brandHue}200`] = palette.primary[2].hex;

  // Accent: accent[0..1] → {accentHue}500/200
  colors[`${accentHueName}500`] = palette.accent[0].hex;
  colors[`${accentHueName}200`] = palette.accent[1].hex;

  // Neutral: neutral[0..10] → gray950..gray50
  const neutralNames = [
    "gray950", "gray900", "gray800", "gray700", "gray600",
    "gray500", "gray400", "gray300", "gray200", "gray100", "gray50",
  ];
  for (let i = 0; i < Math.min(palette.neutral.length, neutralNames.length); i++) {
    colors[neutralNames[i]] = palette.neutral[i].hex;
  }

  // Semantic main hues: semantic[0..3] → green500, red500, amber500, cyan500
  const semanticMainKeys = ["green500", "red500", "amber500", "cyan500"];
  const semanticHues = [145, 25, 80, 250]; // matches color.ts oklch hues
  for (let i = 0; i < Math.min(palette.semantic.length, semanticMainKeys.length); i++) {
    colors[semanticMainKeys[i]] = palette.semantic[i].hex;
  }

  // Semantic light variants: oklch(0.9, 0.04, sameHue) → green200, red200, amber200, cyan200
  const semanticLightKeys = ["green200", "red200", "amber200", "cyan200"];
  for (let i = 0; i < semanticHues.length; i++) {
    colors[semanticLightKeys[i]] = oklchToHex(0.9, 0.04, semanticHues[i]);
  }

  // Surface: surface[0..3] → surfaceBase/Subtle/Muted/Raised
  const surfaceNames = ["surfaceBase", "surfaceSubtle", "surfaceMuted", "surfaceRaised"];
  for (let i = 0; i < Math.min(palette.surface.length, surfaceNames.length); i++) {
    colors[surfaceNames[i]] = palette.surface[i].hex;
  }

  // Border: border[0..2] → borderSubtle/Default/Strong
  const borderNames = ["borderSubtle", "borderDefault", "borderStrong"];
  for (let i = 0; i < Math.min(palette.border.length, borderNames.length); i++) {
    colors[borderNames[i]] = palette.border[i].hex;
  }

  // Dark surface: dark.surface[0..2] → darkBg/darkSubtle/darkRaised
  colors["darkBg"] = palette.dark.surface[0]?.hex ?? oklchToHex(0.12, 0.005, primaryHue);
  colors["darkSubtle"] = palette.dark.surface[1]?.hex ?? oklchToHex(0.16, 0.007, primaryHue);
  colors["darkRaised"] = palette.dark.surface[2]?.hex ?? oklchToHex(0.2, 0.009, primaryHue);

  // Dark text: dark.text[0..2] → darkTextMuted/darkTextDefault/darkTextStrong
  colors["darkTextMuted"] = palette.dark.text[0]?.hex ?? oklchToHex(0.55, 0.01, primaryHue);
  colors["darkTextDefault"] = palette.dark.text[1]?.hex ?? oklchToHex(0.75, 0.008, primaryHue);
  colors["darkTextStrong"] = palette.dark.text[2]?.hex ?? oklchToHex(0.95, 0.003, primaryHue);

  // Dark borders: use culori oklch(l:0.18/0.22/0.28, c:0.008, h:primaryHue)
  colors["darkBorderSubtle"] = oklchToHex(0.18, 0.008, primaryHue);
  colors["darkBorderDefault"] = oklchToHex(0.22, 0.008, primaryHue);
  colors["darkBorderStrong"] = oklchToHex(0.28, 0.008, primaryHue);

  // Constants
  colors["white"] = "#ffffff";
  colors["black"] = "#000000";

  return { colors };
}

// ─── Layer 2: Semantic ────────────────────────────────────────────────────────

export function generateSemantic(
  primitive: PrimitiveTokens,
  archetype: ArchetypePreset
): SemanticTokens {
  // Detect brand hue from primitive: find the non-gray/green/red/amber/cyan *500 key
  const knownSemanticPrefixes = new Set(["gray", "green", "red", "amber", "cyan"]);
  let brandHueName = "blue";
  let accentHueName = "orange";

  const allKeys = Object.keys(primitive.colors);
  const keys500 = allKeys.filter((k) => k.endsWith("500"));
  for (const k of keys500) {
    const prefix = k.replace("500", "");
    if (!knownSemanticPrefixes.has(prefix)) {
      brandHueName = prefix;
      break;
    }
  }

  // Detect accent: find a *200 or *500 key that is not brand, gray, or semantic
  const knownFixed = new Set([...knownSemanticPrefixes, brandHueName]);
  for (const k of keys500) {
    const prefix = k.replace("500", "");
    if (!knownFixed.has(prefix)) {
      accentHueName = prefix;
      break;
    }
  }

  const light: Record<string, string> = {
    // Backgrounds
    bgBase: "surfaceBase",
    bgSubtle: "surfaceSubtle",
    bgMuted: "surfaceMuted",
    bgRaised: "surfaceRaised",
    // Text
    textStrong: "gray900",
    textDefault: "gray600",
    textMuted: "gray400",
    // Borders
    borderSubtle: "borderSubtle",
    borderDefault: "borderDefault",
    borderStrong: "borderStrong",
    // Brand
    brandPrimary: `${brandHueName}500`,
    brandHover: `${brandHueName}700`,
    brandLight: `${brandHueName}200`,
    // Accent
    accentPrimary: `${accentHueName}500`,
    accentLight: `${accentHueName}200`,
    // Semantic
    success: "green500",
    successLight: "green200",
    error: "red500",
    errorLight: "red200",
    warning: "amber500",
    warningLight: "amber200",
    info: "cyan500",
    infoLight: "cyan200",
    // Constants
    white: "white",
    black: "black",
  };

  const dark: Record<string, string> = {
    // Backgrounds
    bgBase: "darkBg",
    bgSubtle: "darkSubtle",
    bgRaised: "darkRaised",
    // Text
    textStrong: "darkTextStrong",
    textDefault: "darkTextDefault",
    textMuted: "darkTextMuted",
    // Borders
    borderSubtle: "darkBorderSubtle",
    borderDefault: "darkBorderDefault",
    borderStrong: "darkBorderStrong",
    // Brand (shared with light)
    brandPrimary: `${brandHueName}500`,
    brandHover: `${brandHueName}700`,
    brandLight: `${brandHueName}200`,
    // Accent (shared with light)
    accentPrimary: `${accentHueName}500`,
    accentLight: `${accentHueName}200`,
    // Semantic (shared with light)
    success: "green500",
    successLight: "green200",
    error: "red500",
    errorLight: "red200",
    warning: "amber500",
    warningLight: "amber200",
    info: "cyan500",
    infoLight: "cyan200",
    // Constants
    white: "white",
    black: "black",
  };

  return { light, dark };
}

// ─── Layer 3: Component ───────────────────────────────────────────────────────

export function generateComponent(semantic: SemanticTokens): ComponentTokens {
  return {
    button: {
      primary: {
        bg: "brandPrimary",
        bgHover: "brandHover",
        bgActive: "brandHover",
        bgDisabled: "bgMuted",
        text: "white",
        textDisabled: "textMuted",
      },
      secondary: {
        bg: "bgMuted",
        bgHover: "bgRaised",
        bgActive: "borderSubtle",
        bgDisabled: "bgMuted",
        text: "textStrong",
        textDisabled: "textMuted",
      },
      ghost: {
        bg: "transparent",
        bgHover: "bgSubtle",
        bgActive: "bgMuted",
        bgDisabled: "transparent",
        text: "brandPrimary",
        textDisabled: "textMuted",
        border: "borderDefault",
        borderDisabled: "borderSubtle",
      },
    },
    input: {
      default: {
        bg: "bgBase",
        border: "borderDefault",
        text: "textStrong",
        placeholder: "textMuted",
        label: "textStrong",
        helper: "textDefault",
      },
      focus: {
        border: "brandPrimary",
      },
      error: {
        border: "error",
        errorText: "error",
      },
      disabled: {
        bg: "bgMuted",
        border: "borderSubtle",
      },
    },
    card: {
      default: {
        bg: "bgSubtle",
        border: "borderSubtle",
        headerText: "textStrong",
        bodyText: "textDefault",
      },
    },
    badge: {
      default: {
        bg: "bgMuted",
        text: "textDefault",
      },
      success: {
        bg: "successLight",
        text: "success",
      },
      error: {
        bg: "errorLight",
        text: "error",
      },
      warning: {
        bg: "warningLight",
        text: "warning",
      },
      info: {
        bg: "infoLight",
        text: "info",
      },
    },
    avatar: {
      default: {
        bg: "brandLight",
        text: "brandPrimary",
        statusOnline: "success",
        statusOffline: "textMuted",
      },
    },
    divider: {
      default: {
        line: "borderSubtle",
        labelText: "textMuted",
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
