import { parse as parseYaml } from "yaml";
import { converter } from "culori";
import type { ExtractedRecord, BtnShape } from "../types.js";
import type { Oklch } from "../../../src/schema/types.js";
import { extractYamlFrontmatter } from "./format.js";

const toOklch = converter("oklch");

interface YamlTypographyRole {
  fontSize?: string | number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: string | number;
}

interface YamlDoc {
  colors?: Record<string, string>;
  typography?: Record<string, YamlTypographyRole>;
  rounded?: Record<string, string | number>;
  components?: Record<string, { rounded?: string }>;
}

const NEUTRAL_KEYS = new Set([
  "ink", "body", "muted", "muted-soft", "hairline", "hairline-soft",
  "canvas", "border-strong", "scrim",
]);

function hexToOklch(hex: string): Oklch | null {
  const o = toOklch(hex);
  if (!o) return null;
  return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 };
}

function parsePxNumber(v: string | number | undefined): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  const trimmed = v.trim().toLowerCase();
  if (trimmed === "normal") return 0;
  const m = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(px)?$/);
  return m ? Number(m[1]) : null;
}

function resolveTokenRef(
  ref: string | undefined,
  table: Record<string, string | number> | undefined,
): string | number | null {
  if (!ref || !table) return null;
  const m = ref.match(/^\{([^.]+)\.([^}]+)\}$/);
  if (!m) return null;
  const [, group, key] = m;
  if (group !== "rounded") return null;
  return table[key] ?? null;
}

function pickComponentRadius(doc: YamlDoc, candidates: string[]): number | null {
  const components = doc.components ?? {};
  for (const key of candidates) {
    if (key in components) {
      const ref = components[key].rounded;
      const resolved = resolveTokenRef(ref, doc.rounded);
      const px = parsePxNumber(resolved as string | number | undefined);
      if (px !== null) return px;
    }
  }
  return null;
}

function pickAccentHex(colors: Record<string, string>, primaryHex: string): string | null {
  const candidates = ["accent", "secondary", "luxe", "plus", "highlight"];
  for (const k of candidates) if (k in colors) return colors[k];
  for (const [k, hex] of Object.entries(colors)) {
    if (hex.toLowerCase() === primaryHex.toLowerCase()) continue;
    if (NEUTRAL_KEYS.has(k)) continue;
    if (k.startsWith("primary") || k.startsWith("on-")) continue;
    if (k.startsWith("surface-") || k.startsWith("hairline")) continue;
    const o = hexToOklch(hex);
    if (o && o.c > 0.05) return hex;
  }
  return null;
}

function pickGrayHex(colors: Record<string, string>): string | null {
  for (const k of ["muted", "muted-soft", "body", "ink", "border-strong", "hairline"]) {
    if (k in colors) return colors[k];
  }
  return null;
}

function pickDisplayRole(typography: Record<string, YamlTypographyRole>): string | null {
  if ("display-xl" in typography) return "display-xl";
  if ("display-lg" in typography) return "display-lg";
  let best: { name: string; size: number } | null = null;
  for (const [name, val] of Object.entries(typography)) {
    const size = parsePxNumber(val.fontSize);
    if (size !== null && (best === null || size > best.size)) best = { name, size };
  }
  return best?.name ?? null;
}

function pickBodyRole(typography: Record<string, YamlTypographyRole>): string | null {
  for (const k of ["body-md", "body", "body-base", "body-sm"]) if (k in typography) return k;
  return null;
}

function classifyBtnShape(radius: number | null): BtnShape | null {
  if (radius === null) return null;
  if (radius >= 9999) return 3;
  if (radius >= 8) return 2;
  if (radius >= 3) return 1;
  return 0;
}

function detectDarkMode(doc: YamlDoc, raw: string): boolean {
  const colors = doc.colors ?? {};
  for (const k of Object.keys(colors)) {
    if (/-on-dark$|^dark-|-dark$/.test(k)) return true;
  }
  if (/\b(dark\s+(mode|theme))\b/i.test(raw)) return true;
  return false;
}

export function extractFromYaml(system: string, md: string): ExtractedRecord | null {
  const fm = extractYamlFrontmatter(md);
  if (fm === null) return null;
  let doc: YamlDoc;
  try {
    doc = (parseYaml(fm) as YamlDoc) ?? {};
  } catch {
    return null;
  }

  const colors = doc.colors ?? {};
  const primaryHex = colors.primary ?? null;
  const brand = primaryHex ? hexToOklch(primaryHex) : null;
  const accentHex = primaryHex ? pickAccentHex(colors, primaryHex) : null;
  const accentOklch = accentHex ? hexToOklch(accentHex) : null;
  const grayHex = pickGrayHex(colors);
  const grayOklch = grayHex ? hexToOklch(grayHex) : null;

  const typography = doc.typography ?? {};
  const displayKey = pickDisplayRole(typography);
  const display = displayKey ? typography[displayKey] : undefined;
  const bodyKey = pickBodyRole(typography);
  const body = bodyKey ? typography[bodyKey] : undefined;

  const btnRadius = pickComponentRadius(doc, ["button-primary", "button", "button-default"]);
  const cardRadius = pickComponentRadius(doc, ["card", "card-product", "card-listing", "card-default"]);

  return {
    system,
    btn_radius: btnRadius,
    card_radius: cardRadius,
    heading_weight: display?.fontWeight ?? null,
    body_line_height: typeof body?.lineHeight === "number" ? body.lineHeight : null,
    heading_letter_spacing: parsePxNumber(display?.letterSpacing),
    shadow_intensity: null,
    btn_shape: classifyBtnShape(btnRadius),
    brand_l: brand?.l ?? null,
    brand_c: brand?.c ?? null,
    brand_h: brand?.h ?? null,
    dark_mode_present: detectDarkMode(doc, md),
    gray_chroma: grayOklch?.c ?? null,
    accent_offset: brand && accentOklch ? ((accentOklch.h - brand.h) % 360 + 360) % 360 : null,
  };
}
