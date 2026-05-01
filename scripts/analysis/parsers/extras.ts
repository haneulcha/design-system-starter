import { parse as parseYaml } from "yaml";
import { extractYamlFrontmatter } from "./format.js";

interface YamlExtras {
  colors?: Record<string, string>;
  typography?: Record<string, { fontFamily?: string }>;
  spacing?: Record<string, string | number>;
}

// Distinctive serif family names — chosen to avoid matching common prose words.
// Each entry is matched with word boundaries (see SERIF_FAMILY_REGEX below).
const SERIF_FAMILY_NAMES = [
  "playfair display", "merriweather", "tiempos", "gt sectra", "source serif",
  "cormorant garamond", "pt serif", "crimson text", "noto serif",
  "didot", "bodoni moda", "freight text", "publico", "fraunces", "lyon",
  "canela", "ivypresto", "ivy presto", "redaction", "stix two",
];

const KNOWN_SANS_FAMILY_NAMES = [
  "inter", "sf pro", "helvetica", "roboto", "circular", "neue haas", "neue",
  "graphik", "söhne", "soehne", "founders", "general sans", "untitled sans",
  "ibm plex sans", "ibm plex", "manrope", "geist", "cabinet grotesk",
  "system-ui", "geist mono", "monaspace", "noto sans", "open sans", "work sans",
  "rubik", "satoshi", "supreme", "switzer", "raleway", "poppins", "neuemontreal",
  "neuehaas", "spacegrotesk", "space grotesk", "azeret", "twkeverett",
  "matter", "haas grotesk", "ttcommons", "tt commons", "univers",
  "instrument sans", "neuetelegraf", "söhne", "redaction",
  "notioninter", "cereal", "faktum", "sailec", "sf mono",
];

const SANS_SUFFIX = /sans-?serif/i;
const SERIF_SUFFIX = /(?<!sans[-\s]?)serif/i;

function firstFontFamilyToken(spec: string): string | null {
  if (!spec) return null;
  // "'Airbnb Cereal VF', Circular, sans-serif" -> "Airbnb Cereal VF"
  const first = spec.split(",")[0]?.trim();
  if (!first) return null;
  return first.replace(/^["']|["']$/g, "").toLowerCase().trim() || null;
}

function looksSerif(spec: string): boolean {
  const lower = spec.toLowerCase();
  if (SERIF_SUFFIX.test(lower) && !SANS_SUFFIX.test(lower.replace(/sans-?serif/g, ""))) {
    return true;
  }
  if (SANS_SUFFIX.test(lower)) {
    // remove sans-serif tokens, then re-check
    const stripped = lower.replace(/sans-?serif/g, "");
    if (SERIF_SUFFIX.test(stripped)) return true;
  } else if (/serif/i.test(lower)) {
    return true;
  }
  return SERIF_FAMILY_NAMES.some((n) => lower.includes(n));
}

function parseYamlDoc(md: string): YamlExtras | null {
  const fm = extractYamlFrontmatter(md);
  if (fm === null) return null;
  try {
    return (parseYaml(fm) as YamlExtras) ?? null;
  } catch {
    return null;
  }
}

export function parseTypographyHasSerif(md: string): boolean | null {
  const doc = parseYamlDoc(md);
  if (doc?.typography) {
    let sawAny = false;
    for (const role of Object.values(doc.typography)) {
      const ff = role.fontFamily;
      if (typeof ff !== "string" || ff.length === 0) continue;
      sawAny = true;
      if (looksSerif(ff)) return true;
    }
    if (sawAny) return false;
  }
  // Markdown fallback: scan body for explicit font-family declarations.
  // We deliberately do NOT use the bare word "serif" as a positive signal —
  // many sans-only systems mention "sans-serif fallback" or reference a serif
  // family in prose without using one as their primary face.
  const matches = md.match(/font-family\s*:\s*[^;\n]+/gi);
  if (matches && matches.length > 0) {
    if (matches.some(looksSerif)) return true;
    return false;
  }
  const lower = md.toLowerCase();
  // Match only specific named serif families, not the generic "serif" keyword
  const hasSerif = SERIF_FAMILY_NAMES.some((n) => lower.includes(n));
  const hasSans = KNOWN_SANS_FAMILY_NAMES.some((n) => lower.includes(n));
  if (hasSerif) return true;
  if (hasSans) return false;
  return null;
}

export function parseFontFamilyCount(md: string): number | null {
  const doc = parseYamlDoc(md);
  if (doc?.typography) {
    const families = new Set<string>();
    for (const role of Object.values(doc.typography)) {
      const tok = typeof role.fontFamily === "string" ? firstFontFamilyToken(role.fontFamily) : null;
      if (tok) families.add(tok);
    }
    if (families.size > 0) return families.size;
  }
  const matches = md.match(/font-family\s*:\s*[^;\n]+/gi);
  if (matches && matches.length > 0) {
    const families = new Set<string>();
    for (const m of matches) {
      const tok = firstFontFamilyToken(m.replace(/^font-family\s*:\s*/i, ""));
      if (tok) families.add(tok);
    }
    if (families.size > 0) return families.size;
  }
  // Markdown prose fallback: count distinct known family-name mentions
  const lower = md.toLowerCase();
  const found = new Set<string>();
  for (const n of [...SERIF_FAMILY_NAMES, ...KNOWN_SANS_FAMILY_NAMES]) {
    if (lower.includes(n)) found.add(n);
  }
  return found.size > 0 ? found.size : null;
}

export function parseColorPaletteSize(md: string): number | null {
  const doc = parseYamlDoc(md);
  if (doc?.colors && Object.keys(doc.colors).length > 0) {
    return Object.keys(doc.colors).length;
  }
  // Markdown fallback: count distinct hex codes (#fff or #ffffff style)
  const hex = md.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g);
  if (!hex) return null;
  const distinct = new Set(hex.map((h) => h.toLowerCase()));
  return distinct.size > 0 ? distinct.size : null;
}

// Plausible spacing token range (px). Excludes radii sentinels (9999) and
// outlier "section" gaps that aren't part of the spacing scale.
const SPACING_MIN_PX = 1;
const SPACING_MAX_PX = 200;

export function parseSpacingRangeRatio(md: string): number | null {
  const doc = parseYamlDoc(md);
  const values: number[] = [];
  if (doc?.spacing) {
    for (const v of Object.values(doc.spacing)) {
      const px = typeof v === "number" ? v : parsePxLoose(v);
      if (px !== null && px >= SPACING_MIN_PX && px <= SPACING_MAX_PX) values.push(px);
    }
  }
  if (values.length === 0) {
    // Markdown fallback: locate "Spacing" section and pull px values
    const spacingMatch = md.match(/##\s*\d*\.?\s*spacing[\s\S]*?(?=\n##\s|\n#\s|$)/i);
    if (spacingMatch) {
      for (const m of spacingMatch[0].matchAll(/(\d+(?:\.\d+)?)\s*px/g)) {
        const n = Number(m[1]);
        if (n >= SPACING_MIN_PX && n <= SPACING_MAX_PX) values.push(n);
      }
    }
  }
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min <= 0) return null;
  return max / min;
}

function parsePxLoose(v: string | number): number | null {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d+(?:\.\d+)?)\s*(px)?$/);
  return m ? Number(m[1]) : null;
}
