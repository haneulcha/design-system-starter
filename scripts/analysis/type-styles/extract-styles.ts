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

function findSubsection(section: string, name: string): string | null {
  const lines = section.split("\n");
  const target = name.toLowerCase().trim();
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^###\s+(.+?)\s*$/);
    if (m && m[1].toLowerCase().trim() === target) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx; i < lines.length; i++) {
    if (/^#{1,3}\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n").trim();
}

function extractBacktickedNames(s: string): string[] {
  return [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

function parseFontFamilySubsection(sub: string | null): FontFamilyMetadata {
  const ff = emptyFontFamily();
  if (!sub) return ff;
  for (const line of sub.split("\n")) {
    const m = line.match(/^\s*[-*]\s+\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
    if (!m) continue;
    const label = m[1].toLowerCase().trim();
    const body = m[2];
    const names = extractBacktickedNames(body);
    if (label === "primary") {
      ff.primary = names[0] ?? null;
      if (names.length > 1) {
        ff.primaryFallbacks = names.slice(1).flatMap((n) =>
          n.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
        );
      }
    } else if (label === "monospace" || label === "mono") {
      ff.mono = names[0] ?? null;
      if (names.length > 1) {
        ff.monoFallbacks = names.slice(1).flatMap((n) =>
          n.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
        );
      }
    } else if (label === "display") {
      ff.display = names[0] ?? null;
    } else if (label === "opentype features" || label === "features") {
      ff.openTypeFeatures = names.flatMap((n) =>
        n.split(/,\s*/).map((s) => s.replace(/^"|"$/g, "").trim()).filter(Boolean),
      );
    }
  }
  return ff;
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

  const fontFamily = parseFontFamilySubsection(findSubsection(section, "Font Family"));
  const principlesText = findSubsection(section, "Principles") ?? "";

  return {
    system,
    hasTypographySection: true,
    rows,
    fontFamily,
    principlesText,
  };
}
