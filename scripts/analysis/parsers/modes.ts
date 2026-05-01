import { findSection } from "./section.js";

const DARK_MODE_PHRASE = /\b(dark\s+(mode|theme))\b/i;
const DARK_TABLE_COLUMN = /\|\s*Dark\s*\|/i;

export function parseDarkModePresent(md: string): boolean {
  if (findSection(md, "Dark Mode") !== null) return true;
  if (findSection(md, "Dark Theme") !== null) return true;
  if (DARK_TABLE_COLUMN.test(md)) return true;
  if (DARK_MODE_PHRASE.test(md)) return true;
  return false;
}
