import type { DesignTokens, DesignSystem, Oklch } from "@core/schema/types.js";
import { formatOklch, formatOklchAlpha } from "@core/generator/color.js";

// ─── Token Resolution ───────────────────────────────────────────────────────

export function resolveOklch(tokens: DesignTokens, semanticKey: string): Oklch | null {
  const ref = tokens.semantic[semanticKey];
  if (!ref) return null;
  const lastDash = ref.lastIndexOf("-");
  const hue = ref.slice(0, lastDash);
  const step = ref.slice(lastDash + 1);
  return tokens.primitive.colors[hue]?.[step]?.light ?? null;
}

export function resolveColor(tokens: DesignTokens, key: string): string {
  const color = resolveOklch(tokens, key);
  return color ? formatOklch(color) : "oklch(0.8 0 0)";
}

export function resolveColorAlpha(tokens: DesignTokens, key: string, alpha: number): string {
  const color = resolveOklch(tokens, key);
  return color ? formatOklchAlpha(color, alpha) : "oklch(0.8 0 0)";
}

export function resolveComponentColor(tokens: DesignTokens, componentPath: string): string {
  const [comp, variant, prop] = componentPath.split(".");
  const semanticKey = tokens.component[comp]?.[variant]?.[prop];
  if (!semanticKey) return "oklch(0.8 0 0)";
  if (semanticKey === "transparent") return "transparent";
  return resolveColor(tokens, semanticKey);
}

// ─── Font ───────────────────────────────────────────────────────────────────

/** Returns the fully-resolved sans font chain from typographyTokens. */
export function buildFontFamily(system: DesignSystem): string {
  return system.typographyTokens.fontChains.sans;
}

/** Strips fallback chain to the first family name (for Google Fonts loader). */
export function primaryFontName(system: DesignSystem): string {
  const first = system.typographyTokens.fontChains.sans.split(",")[0].trim();
  return first.replace(/^["']|["']$/g, "");
}

export function loadGoogleFont(family: string): void {
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function parsePx(size: string): number {
  return parseInt(size, 10);
}

export function weightLabel(weight: number): string {
  const map: Record<number, string> = {
    100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular",
    500: "Medium", 600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black",
  };
  return map[weight] ?? String(weight);
}
