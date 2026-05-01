import { findSection } from "../parsers/section.js";
import {
  parseSize,
  parseWeight,
  parseLineHeight,
  parseLetterSpacing,
} from "./parse-values.js";
import type {
  TypeStyleRow,
  SystemResult,
  FontFamilyMetadata,
} from "./types.js";

const HEADER_ALIASES: Record<string, string> = {
  role: "role",
  token: "role",
  font: "font",
  size: "size",
  weight: "weight",
  "line height": "lineHeight",
  "letter spacing": "letterSpacing",
  features: "features",
  notes: "notes",
  use: "notes",
};

function splitRow(line: string): string[] {
  // Markdown table rows usually have leading + trailing pipes that produce
  // empty strings on split; strip those before returning.
  const parts = line.split("|").map((c) => c.trim());
  if (parts.length > 0 && parts[0] === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^[-:\s]+$/.test(c));
}

function parseHeader(cells: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  cells.forEach((c, i) => {
    const key = HEADER_ALIASES[c.toLowerCase().trim()];
    if (key) out[key] = i;
  });
  return out;
}

function stripBackticks(s: string): string {
  return s.replace(/^`+|`+$/g, "");
}

function emptyFontFamily(): FontFamilyMetadata {
  return {
    primary: null,
    primaryFallbacks: [],
    mono: null,
    monoFallbacks: [],
    display: null,
    openTypeFeatures: [],
  };
}

export function extractFromSystem(system: string, md: string): SystemResult {
  const section = findSection(md, "Typography");
  if (section === null) {
    return {
      system,
      hasTypographySection: false,
      rows: [],
      fontFamily: emptyFontFamily(),
      principlesText: "",
    };
  }

  const rows: TypeStyleRow[] = [];
  const lines = section.split("\n");
  let header: Record<string, number> | null = null;
  let rowIndex = 0;

  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      header = null;
      continue;
    }
    const cells = splitRow(line);
    if (isSeparatorRow(cells)) continue;

    if (!header) {
      header = parseHeader(cells);
      if (header.role === undefined || header.size === undefined) {
        header = null;
      }
      continue;
    }

    const get = (k: string) => {
      const idx = header![k];
      if (idx === undefined) return "";
      return cells[idx] ?? "";
    };
    const sizeRaw = get("size");
    const sizeP = parseSize(sizeRaw);
    if (sizeP.value === null) continue;

    const weightP = parseWeight(get("weight"));
    const lhP = parseLineHeight(get("lineHeight"));
    const lsP = parseLetterSpacing(get("letterSpacing"));
    const featuresRaw = get("features");
    const features = featuresRaw
      ? featuresRaw.split(/[,;]\s*/).map(stripBackticks).filter(Boolean)
      : [];

    rows.push({
      system,
      rawRole: stripBackticks(get("role")).replace(/^\{|\}$/g, "").replace(/^typography\./, ""),
      font: header.font !== undefined ? stripBackticks(get("font")) || null : null,
      sizePx: sizeP.value,
      weight: weightP.value,
      ...(weightP.range ? { weightRange: weightP.range } : {}),
      lineHeight: lhP.value,
      ...(lhP.range ? { lineHeightRange: lhP.range } : {}),
      letterSpacingPx: lsP.value,
      ...(lsP.range ? { letterSpacingRange: lsP.range } : {}),
      ...(lsP.uppercase ? { uppercase: true } : {}),
      features,
      notes: get("notes"),
      rowIndex: rowIndex++,
    });
  }

  return {
    system,
    hasTypographySection: true,
    rows,
    fontFamily: emptyFontFamily(),
    principlesText: "",
  };
}
