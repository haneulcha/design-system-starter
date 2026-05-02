import { readFileSync } from "node:fs";
import type { RawComponentRow } from "./types.js";

export interface DictionaryEntry {
  category: string;
  variant?: string;
  state?: string;
  sizeVariant?: string;
  modifier?: string;
  reason?: string;
}

export interface ComponentDictionary {
  version: number;
  scope: string[];
  variants: Record<string, string[]>;
  states: string[];
  sizeVariants: string[];
  modifiers: string[];
  rules: string[];
  mappings: Record<string, DictionaryEntry>;
  excluded: string[];
}

export interface ClassifiedRow extends RawComponentRow {
  category: string;
  variant?: string;
  state?: string;
  sizeVariant?: string;
  modifier?: string;
  reason?: string;
  source: "mapping" | "excluded" | "unmapped";
}

export function loadDictionary(path: string): ComponentDictionary {
  const json = JSON.parse(readFileSync(path, "utf-8")) as ComponentDictionary;
  validateDictionary(json);
  return json;
}

export function validateDictionary(d: ComponentDictionary): void {
  if (d.version !== 1) throw new Error(`unexpected dictionary version ${d.version}`);
  const validCategories = new Set([...d.scope, "_excluded"]);
  for (const [role, entry] of Object.entries(d.mappings)) {
    if (!validCategories.has(entry.category)) {
      throw new Error(`mapping ${role} has unknown category ${entry.category}`);
    }
    if (entry.category !== "_excluded") {
      const allowedVariants = d.variants[entry.category];
      if (entry.variant && allowedVariants && !allowedVariants.includes(entry.variant)) {
        throw new Error(`mapping ${role}: variant '${entry.variant}' not in scope for ${entry.category}`);
      }
      if (entry.state && !d.states.includes(entry.state)) {
        throw new Error(`mapping ${role}: state '${entry.state}' not in scope`);
      }
      if (entry.sizeVariant && !d.sizeVariants.includes(entry.sizeVariant)) {
        throw new Error(`mapping ${role}: sizeVariant '${entry.sizeVariant}' not in scope`);
      }
    }
  }
}

export function classify(rows: RawComponentRow[], dict: ComponentDictionary): ClassifiedRow[] {
  const excludedSet = new Set(dict.excluded);
  return rows.map((r) => {
    const m = dict.mappings[r.rawRole];
    if (m) {
      return { ...r, ...m, source: m.category === "_excluded" ? "excluded" : "mapping" } as ClassifiedRow;
    }
    if (excludedSet.has(r.rawRole)) {
      return { ...r, category: "_excluded", source: "excluded" as const };
    }
    return { ...r, category: "_unmapped", source: "unmapped" as const };
  });
}
