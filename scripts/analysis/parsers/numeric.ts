import { findSection } from "./section.js";
import { FULL_PILL_THRESHOLD_PX } from "../types.js";

const FIRST_PX = /(\d+(?:\.\d+)?)\s*px/;

function firstPxIn(section: string | null): number | null {
  if (!section) return null;
  const m = section.match(FIRST_PX);
  return m ? Number(m[1]) : null;
}

export interface RadiusInfo {
  px: number | null;
  isPill: boolean;
}

export function parseBtnRadiusInfo(md: string): RadiusInfo | null {
  const section = findSection(md, "Buttons");
  if (!section) return null;
  const px = firstPxIn(section);
  if (px === null) return null;
  const isPill = px >= FULL_PILL_THRESHOLD_PX;
  return { px: isPill ? null : px, isPill };
}

export function parseBtnRadius(md: string): number | null {
  return parseBtnRadiusInfo(md)?.px ?? null;
}

export function parseCardRadius(md: string): number | null {
  return firstPxIn(findSection(md, "Cards"));
}
