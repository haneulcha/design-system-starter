import { lastSegment } from "./css-var.js";
import type { ColorItemRow, FrequencyEntry } from "./types.js";

function tally(entries: Array<{ key: string; system: string }>): FrequencyEntry[] {
  const map = new Map<string, { count: number; systems: Set<string> }>();
  for (const { key, system } of entries) {
    const slot = map.get(key);
    if (slot) {
      slot.count += 1;
      slot.systems.add(system);
    } else {
      map.set(key, { count: 1, systems: new Set([system]) });
    }
  }
  const out: FrequencyEntry[] = [];
  for (const [key, { count, systems }] of map) {
    out.push({ key, count, systems: [...systems].sort() });
  }
  out.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return out;
}

export function frequencyBySectionHeading(rows: ColorItemRow[]): FrequencyEntry[] {
  return tally(rows.map((r) => ({ key: r.section_heading, system: r.system })));
}

export function frequencyByCssVarSegment(rows: ColorItemRow[]): FrequencyEntry[] {
  const entries: Array<{ key: string; system: string }> = [];
  for (const r of rows) {
    if (!r.css_var) continue;
    entries.push({ key: lastSegment(r.css_var), system: r.system });
  }
  return tally(entries);
}

export function frequencyByDescriptionKeywords(rows: ColorItemRow[]): FrequencyEntry[] {
  const entries: Array<{ key: string; system: string }> = [];
  for (const r of rows) {
    if (r.description_first_keywords.length === 0) continue;
    entries.push({ key: r.description_first_keywords.join(" "), system: r.system });
  }
  return tally(entries);
}
