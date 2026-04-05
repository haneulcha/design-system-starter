import type { DesignTokens } from "../schema/types.js";
import type {
  FigmaColor,
  FigmaDesignSystem,
  FigmaEffectStyle,
  FigmaShadowLayer,
  FigmaTextStyle,
  FigmaVariable,
  FigmaVariableCollection,
} from "./types.js";

// ── Color helpers ─────────────────────────────────────────────────────────────

function hexToFigmaColor(hex: string): FigmaColor {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  return { r, g, b, a: 1 };
}

function parseRgba(str: string): FigmaColor {
  const match = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseFloat(match[1]) / 255,
    g: parseFloat(match[2]) / 255,
    b: parseFloat(match[3]) / 255,
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

// ── Shadow parser ─────────────────────────────────────────────────────────────

/**
 * Parses a CSS box-shadow string into FigmaShadowLayer[].
 * Supports rgba() and hex colors with 4 space-separated numeric values.
 */
export function parseShadowString(shadow: string): FigmaShadowLayer[] {
  if (!shadow || shadow.trim() === "none") return [];

  // Split on commas NOT inside parentheses
  const parts = shadow.split(/,\s*(?![^(]*\))/);

  return parts
    .map((part): FigmaShadowLayer | null => {
      const trimmed = part.trim();

      let color: FigmaColor;
      let remaining: string;

      // Try rgba/rgb first
      const rgbaMatch = trimmed.match(/^(rgba?\([^)]+\))\s*(.*)/);
      if (rgbaMatch) {
        color = parseRgba(rgbaMatch[1]);
        remaining = rgbaMatch[2].trim();
      } else {
        // Try hex color at start
        const hexMatch = trimmed.match(/^(#[0-9a-fA-F]{3,8})\s*(.*)/);
        if (hexMatch) {
          color = hexToFigmaColor(hexMatch[1]);
          remaining = hexMatch[2].trim();
        } else {
          // Try color at end: numeric values then color
          const endHexMatch = trimmed.match(/(.*?)\s*(#[0-9a-fA-F]{3,8})\s*$/);
          if (endHexMatch) {
            color = hexToFigmaColor(endHexMatch[2]);
            remaining = endHexMatch[1].trim();
          } else {
            return null;
          }
        }
      }

      // Extract numeric values (e.g. "0px 4px 8px" or "0px 0px 0px 1px")
      const nums = [...remaining.matchAll(/-?[\d.]+px/g)].map((m) =>
        parseFloat(m[0])
      );

      const offsetX = nums[0] ?? 0;
      const offsetY = nums[1] ?? 0;
      const radius = nums[2] ?? 0;
      const spread = nums[3] ?? 0;

      return {
        type: "DROP_SHADOW",
        color,
        offset: { x: offsetX, y: offsetY },
        radius,
        spread,
      };
    })
    .filter((l): l is FigmaShadowLayer => l !== null);
}

// ── Title case helper ─────────────────────────────────────────────────────────

function kebabToTitleCase(key: string): string {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ── Main transformer ──────────────────────────────────────────────────────────

export function transformToFigma(tokens: DesignTokens): FigmaDesignSystem {
  // ── Colors collection ──────────────────────────────────────────────────────
  const lightModeId = "mode-light";
  const darkModeId = "mode-dark";

  // Resolve semantic references through primitive.colors
  // Semantic values are "{hue}-{step}" references (e.g. "gray-100", "blue-700")
  // Primitive colors are nested: primitive.colors[hue][step] = { light, dark }
  const primitiveColors = tokens.primitive.colors;

  function resolveColorMode(ref: string, mode: "light" | "dark"): string {
    // Parse "{hue}-{step}" format
    const lastDash = ref.lastIndexOf("-");
    if (lastDash !== -1) {
      const hue = ref.slice(0, lastDash);
      const step = ref.slice(lastDash + 1);
      const hueMap = primitiveColors[hue];
      if (hueMap && hueMap[step]) {
        return hueMap[step][mode];
      }
    }
    return ref; // fallback (e.g. "transparent")
  }

  // Build resolved light and dark color maps from flat semantic
  const resolvedLight: Record<string, string> = {};
  const resolvedDark: Record<string, string> = {};
  for (const [key, ref] of Object.entries(tokens.semantic)) {
    resolvedLight[key] = resolveColorMode(ref, "light");
    resolvedDark[key] = resolveColorMode(ref, "dark");
  }

  // Merge all unique color keys from light and dark
  const allColorKeys = Array.from(
    new Set([...Object.keys(resolvedLight), ...Object.keys(resolvedDark)])
  );

  const colorVariables: FigmaVariable[] = allColorKeys.map((key) => {
    const lightVal = resolvedLight[key];
    const darkVal = resolvedDark[key];
    return {
      name: key,
      type: "COLOR",
      valuesByMode: {
        [lightModeId]: lightVal ?? darkVal ?? "#000000",
        [darkModeId]: darkVal ?? lightVal ?? "#000000",
      },
    };
  });

  const colorsCollection: FigmaVariableCollection = {
    name: "Colors",
    modes: [
      { name: "Light", modeId: lightModeId },
      { name: "Dark", modeId: darkModeId },
    ],
    variables: colorVariables,
  };

  // ── Spacing collection ─────────────────────────────────────────────────────
  const spacingModeId = "mode-default";

  const spacingVariables: FigmaVariable[] = Object.entries(tokens.spacing).map(
    ([name, value]) => ({
      name,
      type: "FLOAT",
      valuesByMode: { [spacingModeId]: value },
    })
  );

  const spacingCollection: FigmaVariableCollection = {
    name: "Spacing",
    modes: [{ name: "Default", modeId: spacingModeId }],
    variables: spacingVariables,
  };

  // ── Border Radius collection ───────────────────────────────────────────────
  const radiusModeId = "mode-default";

  const radiusVariables: FigmaVariable[] = Object.entries(tokens.borderRadius)
    .filter(([, value]) => value >= 0) // exclude -1 (circle / 50%)
    .map(([name, value]) => ({
      name,
      type: "FLOAT",
      valuesByMode: { [radiusModeId]: value },
    }));

  const radiusCollection: FigmaVariableCollection = {
    name: "Border Radius",
    modes: [{ name: "Default", modeId: radiusModeId }],
    variables: radiusVariables,
  };

  // ── Text styles ────────────────────────────────────────────────────────────
  const textStyles: FigmaTextStyle[] = Object.entries(
    tokens.typography.styles
  ).map(([key, style]) => ({
    name: kebabToTitleCase(key),
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  }));

  // ── Effect styles ──────────────────────────────────────────────────────────
  const effectStyles: FigmaEffectStyle[] = Object.entries(tokens.elevation)
    .map(([key, shadowStr]) => {
      const shadows = parseShadowString(shadowStr);
      if (shadows.length === 0) return null;
      return {
        name: kebabToTitleCase(key),
        shadows,
      };
    })
    .filter((e): e is FigmaEffectStyle => e !== null);

  return {
    variableCollections: [colorsCollection, spacingCollection, radiusCollection],
    textStyles,
    effectStyles,
  };
}
