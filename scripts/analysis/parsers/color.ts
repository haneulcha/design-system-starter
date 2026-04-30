import { converter } from "culori";
import { findSection } from "./section.js";
import type { Oklch } from "../../../src/schema/types.js";

const toOklch = converter("oklch");

const HEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/;
const OKLCH = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/i;

function firstColorIn(section: string | null): Oklch | null {
  if (!section) return null;
  const oklchMatch = section.match(OKLCH);
  if (oklchMatch) {
    return { l: Number(oklchMatch[1]), c: Number(oklchMatch[2]), h: Number(oklchMatch[3]) };
  }
  const hexMatch = section.match(HEX);
  if (!hexMatch) return null;
  const hex = "#" + hexMatch[1];
  const o = toOklch(hex);
  if (!o) return null;
  return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 };
}

function brandSection(md: string): string | null {
  return findSection(md, "Brand") ?? findSection(md, "Primary") ?? findSection(md, "Colors");
}

function accentSection(md: string): string | null {
  return findSection(md, "Accent") ?? findSection(md, "Secondary");
}

function graySection(md: string): string | null {
  return findSection(md, "Gray") ?? findSection(md, "Neutral");
}

export function parseBrandOklch(md: string): Oklch | null {
  return firstColorIn(brandSection(md));
}

export function parseGrayChroma(md: string): number | null {
  const o = firstColorIn(graySection(md));
  return o ? o.c : null;
}

export function parseAccentOffset(md: string): number | null {
  const brand = parseBrandOklch(md);
  const accent = firstColorIn(accentSection(md));
  if (!brand || !accent) return null;
  return ((accent.h - brand.h) % 360 + 360) % 360;
}
