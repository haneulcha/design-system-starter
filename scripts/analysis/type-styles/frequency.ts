import type { TypeStyleRow, FrequencyEntry } from "./types.js";

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

export function frequencyByRawRole(rows: TypeStyleRow[]): FrequencyEntry[] {
  return tally(rows.map((r) => ({ key: r.rawRole.toLowerCase(), system: r.system })));
}

export function frequencyBySize(rows: TypeStyleRow[]): FrequencyEntry[] {
  const entries: Array<{ key: string; system: string }> = [];
  for (const r of rows) {
    if (r.sizePx === null) continue;
    entries.push({ key: String(r.sizePx), system: r.system });
  }
  return tally(entries);
}

export function frequencyByWeight(rows: TypeStyleRow[]): FrequencyEntry[] {
  const entries: Array<{ key: string; system: string }> = [];
  for (const r of rows) {
    if (r.weight === null) continue;
    entries.push({ key: String(r.weight), system: r.system });
  }
  return tally(entries);
}
