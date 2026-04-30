import { findSection } from "./section.js";

const FIRST_PX = /(\d+(?:\.\d+)?)\s*px/;

function firstPxIn(section: string | null): number | null {
  if (!section) return null;
  const m = section.match(FIRST_PX);
  return m ? Number(m[1]) : null;
}

export function parseBtnRadius(md: string): number | null {
  return firstPxIn(findSection(md, "Buttons"));
}

export function parseCardRadius(md: string): number | null {
  return firstPxIn(findSection(md, "Cards"));
}
