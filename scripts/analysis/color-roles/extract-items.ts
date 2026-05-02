import { findSection } from "../parsers/section.js";
import { extractCssVar } from "./css-var.js";
import { extractFirstKeywords } from "./keywords.js";
import type { ColorItemRow, SystemResult } from "./types.js";

const BULLET_RE = /^\s*[-*]\s+\*\*(?<label>[^*]+?)\*\*\s*(?<rest>.*)$/;
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const TOKEN_REF_RE = /\{[a-zA-Z][a-zA-Z0-9._-]*\}/;
const SUBHEADING_RE = /^###\s+(.+?)\s*$/;
const HIGHER_HEADING_RE = /^#{1,2}\s+/;

function descriptionAfterColon(rest: string): string {
  const idx = rest.indexOf(":");
  if (idx === -1) return rest.trim();
  return rest.slice(idx + 1).trim();
}

function parseBulletLine(line: string, system: string, heading: string): ColorItemRow | null {
  const m = line.match(BULLET_RE);
  if (!m || !m.groups) return null;
  const label = m.groups.label.trim();
  const rest = m.groups.rest;
  const description = descriptionAfterColon(rest);
  const hexMatch = line.match(HEX_RE);
  const tokenMatch = line.match(TOKEN_REF_RE);
  return {
    system,
    section_heading: heading,
    item_label: label,
    hex: hexMatch ? hexMatch[0].toLowerCase() : null,
    css_var: extractCssVar(line),
    token_ref: tokenMatch ? tokenMatch[0] : null,
    description,
    description_first_keywords: extractFirstKeywords(description),
  };
}

export function extractFromSection(sectionBody: string, system: string): ColorItemRow[] {
  const lines = sectionBody.split("\n");
  const rows: ColorItemRow[] = [];
  let currentHeading = "(no heading)";
  for (const line of lines) {
    if (HIGHER_HEADING_RE.test(line)) break;
    const sub = line.match(SUBHEADING_RE);
    if (sub) {
      currentHeading = sub[1].replace(/^\d+(\.\d+)*\.?\s+/, "").trim();
      continue;
    }
    const row = parseBulletLine(line, system, currentHeading);
    if (row) rows.push(row);
  }
  return rows;
}

export function extractFromSystem(system: string, md: string): SystemResult {
  const section = findSection(md, "Color");
  if (section === null) {
    return { system, has_color_section: false, rows: [] };
  }
  return { system, has_color_section: true, rows: extractFromSection(section, system) };
}
