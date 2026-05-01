import { findSection } from "./section.js";
import { parseBtnRadius } from "./numeric.js";
import type { ShadowIntensity, BtnShape } from "../types.js";

const SHADOW_KEYWORDS: ReadonlyArray<{ level: ShadowIntensity; words: readonly string[] }> = [
  { level: 4, words: ["dramatic", "deep", "heavy", "bold shadow"] },
  { level: 3, words: ["medium"] },
  { level: 2, words: ["subtle"] },
  { level: 1, words: ["whisper", "light shadow", "minimal shadow"] },
  { level: 0, words: ["no shadow", "none", "flat"] },
];

export function parseShadowIntensity(md: string): ShadowIntensity | null {
  const section = findSection(md, "Elevation") ?? findSection(md, "Shadows");
  if (!section) return null;
  const lower = section.toLowerCase();
  for (const { level, words } of SHADOW_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return level;
  }
  return null;
}

export function parseBtnShape(md: string): BtnShape | null {
  const section = findSection(md, "Buttons");
  if (!section) return null;
  if (/\bpill\b/i.test(section)) return 3;
  const radius = parseBtnRadius(md);
  if (radius === null) return null;
  if (radius >= 8) return 2;
  if (radius >= 3) return 1;
  return 0;
}
