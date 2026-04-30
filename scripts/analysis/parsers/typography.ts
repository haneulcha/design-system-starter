import { findSection } from "./section.js";
import { LETTER_SPACING_RANGE } from "../types.js";

interface TypeRow {
  role: string;
  size: number;
  weight: number | null;
  lineHeight: number | null;
  letterSpacing: number | null;
}

function firstPx(cell: string): number | null {
  const m = cell.match(/(-?\d+(?:\.\d+)?)\s*px/);
  return m ? Number(m[1]) : null;
}

function firstNumberInRange(cell: string, lo: number, hi: number): number | null {
  for (const m of cell.matchAll(/(-?\d+(?:\.\d+)?)/g)) {
    const n = Number(m[1]);
    if (n >= lo && n <= hi) return n;
  }
  return null;
}

function parseRows(section: string): TypeRow[] {
  const rows: TypeRow[] = [];
  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length < 2) continue;
    // Skip the alignment/header separator row (e.g., "|---|---|").
    if (cells.every((c) => /^[-:\s]+$/.test(c))) continue;
    const sizeIdx = cells.findIndex((c) => /\d+(?:\.\d+)?\s*px/.test(c));
    if (sizeIdx === -1) continue;
    const size = firstPx(cells[sizeIdx])!;
    const role = cells[0];
    if (/^role$/i.test(role)) continue; // header row

    const weight = firstNumberInRange(cells.slice(1).join(" "), 100, 900);
    // Line height: scan cells excluding the size cell, prefer values in (0.5, 3).
    const lh = (() => {
      for (let i = 0; i < cells.length; i++) {
        if (i === sizeIdx) continue;
        const n = firstNumberInRange(cells[i], 0.5, 3);
        if (n !== null && n !== weight) return n;
      }
      return null;
    })();

    // Letter spacing: scan cells for `-?Npx` other than the size, or "normal".
    let ls: number | null = null;
    for (let i = 0; i < cells.length; i++) {
      if (i === sizeIdx) continue;
      const c = cells[i].toLowerCase();
      if (/(^|\s)normal(\s|$)/.test(c)) { ls = 0; break; }
      const m = c.match(/(-?\d+(?:\.\d+)?)\s*px/);
      if (m) {
        const v = Number(m[1]);
        if (v !== size) { ls = v; break; }
      }
    }

    rows.push({ role, size, weight, lineHeight: lh, letterSpacing: ls });
  }
  return rows;
}

function findRole(rows: TypeRow[], match: (r: TypeRow) => boolean): TypeRow | null {
  return rows.find(match) ?? null;
}

export function parseHeadingWeight(md: string): number | null {
  const section = findSection(md, "Typography");
  if (!section) return null;
  const rows = parseRows(section);
  if (rows.length === 0) return null;
  const display = rows.reduce((a, b) => (a.size >= b.size ? a : b));
  return display.weight;
}

export function parseBodyLineHeight(md: string): number | null {
  const section = findSection(md, "Typography");
  if (!section) return null;
  const rows = parseRows(section);
  const body = findRole(rows, (r) => /^body\b/i.test(r.role));
  return body?.lineHeight ?? null;
}

export function parseHeadingLetterSpacing(md: string): number | null {
  const section = findSection(md, "Typography");
  if (!section) return null;
  const rows = parseRows(section);
  if (rows.length === 0) return null;
  const display = rows.reduce((a, b) => (a.size >= b.size ? a : b));
  const ls = display.letterSpacing;
  if (ls === null) return null;
  const [lo, hi] = LETTER_SPACING_RANGE;
  return ls >= lo && ls <= hi ? ls : null;
}
