import type { ColorItemRow } from "./types.js";

export interface RoleDictionary {
  version: number;
  axis: "section_heading";
  matching: "case_insensitive_exact";
  groups: Record<string, string[]>;
  exclude: string[];
  notes?: Record<string, string>;
}

export type MatchKind = "matched" | "excluded" | "unmatched";

export interface MatchedRow extends ColorItemRow {
  match_kind: MatchKind;
  matched_role: string | null;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

interface CompiledDictionary {
  groups: Map<string, string>;
  exclude: Set<string>;
}

function compile(dict: RoleDictionary): CompiledDictionary {
  const groups = new Map<string, string>();
  for (const [role, headings] of Object.entries(dict.groups)) {
    for (const heading of headings) {
      const key = norm(heading);
      if (groups.has(key)) {
        throw new Error(`heading "${heading}" appears in multiple groups`);
      }
      groups.set(key, role);
    }
  }
  const exclude = new Set(dict.exclude.map(norm));
  for (const ex of exclude) {
    if (groups.has(ex)) {
      throw new Error(`heading "${ex}" is in both a group and exclude`);
    }
  }
  return { groups, exclude };
}

export function classifyRow(row: ColorItemRow, compiled: CompiledDictionary): MatchedRow {
  const key = norm(row.section_heading);
  const role = compiled.groups.get(key);
  if (role) return { ...row, match_kind: "matched", matched_role: role };
  if (compiled.exclude.has(key)) return { ...row, match_kind: "excluded", matched_role: null };
  return { ...row, match_kind: "unmatched", matched_role: null };
}

export function classifyAll(rows: ColorItemRow[], dict: RoleDictionary): MatchedRow[] {
  const compiled = compile(dict);
  return rows.map((r) => classifyRow(r, compiled));
}

export function validateDictionary(dict: unknown): RoleDictionary {
  if (typeof dict !== "object" || dict === null) {
    throw new Error("dictionary: not an object");
  }
  const d = dict as Record<string, unknown>;
  if (d.axis !== "section_heading") throw new Error("dictionary: axis must be 'section_heading'");
  if (d.matching !== "case_insensitive_exact") {
    throw new Error("dictionary: matching must be 'case_insensitive_exact'");
  }
  if (typeof d.groups !== "object" || d.groups === null) throw new Error("dictionary: groups missing");
  if (!Array.isArray(d.exclude)) throw new Error("dictionary: exclude must be an array");
  return d as unknown as RoleDictionary;
}
