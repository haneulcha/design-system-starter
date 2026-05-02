import { hexToOklch, IMPLICIT_CHROMA_MAX } from "./neutral-baseline.js";
import { circularDistance, profileAll as profileAccents, buildSamples as buildAccentSamples, type SystemAccentProfile } from "./accent-baseline.js";
import type { MatchedRow } from "./dictionary.js";

const ACCENT_HUE_TOLERANCE = 20;
const ACCENT_CHROMA_MIN = 0.05;

export type SemanticRole = "surface" | "text" | "semantic";
export type BaseOrigin = "neutral" | "accent" | "unique" | "no_color";

export interface SemanticSample {
  system: string;
  role: SemanticRole;
  hex: string | null;
  l: number | null;
  c: number | null;
  h: number | null;
  base_origin: BaseOrigin;
  item_label: string;
  description_first_keywords: string[];
}

export interface SystemRoleProfile {
  system: string;
  role: SemanticRole;
  row_count: number;
  distinct_hex_count: number;
  origin_breakdown: Record<BaseOrigin, number>;
}

export interface CorpusStat {
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

export interface RoleStats {
  role: SemanticRole;
  systems_present: number;
  total_rows: number;
  row_count: CorpusStat;
  distinct_hex_count: CorpusStat;
  origin_share: Record<BaseOrigin, number>;
  top_keywords: { key: string; count: number; systems: number }[];
  top_labels: { key: string; count: number; systems: number }[];
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base] + rest * ((sorted[base + 1] ?? sorted[base]) - sorted[base]);
}

function corpusStat(xs: number[]): CorpusStat {
  if (xs.length === 0) return { median: 0, q1: 0, q3: 0, min: 0, max: 0 };
  return {
    median: median(xs),
    q1: quantile(xs, 0.25),
    q3: quantile(xs, 0.75),
    min: Math.min(...xs),
    max: Math.max(...xs),
  };
}

export function classifyOrigin(
  c: number | null,
  h: number | null,
  systemAccent: SystemAccentProfile | null,
): BaseOrigin {
  if (c === null) return "no_color";
  if (c <= IMPLICIT_CHROMA_MAX) return "neutral";
  if (c >= ACCENT_CHROMA_MIN && h !== null && systemAccent?.primary) {
    if (circularDistance(systemAccent.primary.primary_h, h) <= ACCENT_HUE_TOLERANCE) {
      return "accent";
    }
  }
  return "unique";
}

export function buildSemanticSamples(
  rows: MatchedRow[],
  accentProfilesBySystem: Map<string, SystemAccentProfile>,
): SemanticSample[] {
  const samples: SemanticSample[] = [];
  for (const row of rows) {
    const role = row.matched_role;
    if (role !== "surface" && role !== "text" && role !== "semantic") continue;
    const accentProfile = accentProfilesBySystem.get(row.system) ?? null;
    if (!row.hex) {
      samples.push({
        system: row.system,
        role: role as SemanticRole,
        hex: null,
        l: null,
        c: null,
        h: null,
        base_origin: "no_color",
        item_label: row.item_label,
        description_first_keywords: row.description_first_keywords,
      });
      continue;
    }
    const o = hexToOklch(row.hex);
    if (!o) {
      samples.push({
        system: row.system,
        role: role as SemanticRole,
        hex: row.hex,
        l: null,
        c: null,
        h: null,
        base_origin: "no_color",
        item_label: row.item_label,
        description_first_keywords: row.description_first_keywords,
      });
      continue;
    }
    samples.push({
      system: row.system,
      role: role as SemanticRole,
      hex: row.hex,
      l: o.l,
      c: o.c,
      h: o.h,
      base_origin: classifyOrigin(o.c, o.h, accentProfile),
      item_label: row.item_label,
      description_first_keywords: row.description_first_keywords,
    });
  }
  return samples;
}

export function profilePerSystemRole(samples: SemanticSample[]): SystemRoleProfile[] {
  const grouped = new Map<string, SemanticSample[]>();
  for (const s of samples) {
    const key = `${s.system}::${s.role}`;
    const arr = grouped.get(key) ?? [];
    arr.push(s);
    grouped.set(key, arr);
  }
  const profiles: SystemRoleProfile[] = [];
  for (const [key, group] of grouped) {
    const [system, role] = key.split("::") as [string, SemanticRole];
    const distinctHex = new Set<string>();
    const origin: Record<BaseOrigin, number> = { neutral: 0, accent: 0, unique: 0, no_color: 0 };
    for (const s of group) {
      if (s.hex) distinctHex.add(s.hex);
      origin[s.base_origin] += 1;
    }
    profiles.push({
      system,
      role,
      row_count: group.length,
      distinct_hex_count: distinctHex.size,
      origin_breakdown: origin,
    });
  }
  return profiles.sort((a, b) => a.system.localeCompare(b.system) || a.role.localeCompare(b.role));
}

function topKeywordOrLabel(
  samples: SemanticSample[],
  pick: (s: SemanticSample) => string,
): { key: string; count: number; systems: number }[] {
  const map = new Map<string, { count: number; systems: Set<string> }>();
  for (const s of samples) {
    const key = pick(s);
    if (!key) continue;
    const slot = map.get(key) ?? { count: 0, systems: new Set() };
    slot.count += 1;
    slot.systems.add(s.system);
    map.set(key, slot);
  }
  const entries = [...map.entries()]
    .map(([key, v]) => ({ key, count: v.count, systems: v.systems.size }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return entries;
}

export function computeRoleStats(role: SemanticRole, samples: SemanticSample[]): RoleStats {
  const roleSamples = samples.filter((s) => s.role === role);
  const profilesByRole = profilePerSystemRole(samples).filter((p) => p.role === role);
  const rowCounts = profilesByRole.map((p) => p.row_count);
  const hexCounts = profilesByRole.map((p) => p.distinct_hex_count);
  const totalOrigin: Record<BaseOrigin, number> = { neutral: 0, accent: 0, unique: 0, no_color: 0 };
  for (const s of roleSamples) totalOrigin[s.base_origin] += 1;
  const total = roleSamples.length;
  const share: Record<BaseOrigin, number> = {
    neutral: total > 0 ? totalOrigin.neutral / total : 0,
    accent: total > 0 ? totalOrigin.accent / total : 0,
    unique: total > 0 ? totalOrigin.unique / total : 0,
    no_color: total > 0 ? totalOrigin.no_color / total : 0,
  };
  return {
    role,
    systems_present: profilesByRole.length,
    total_rows: total,
    row_count: corpusStat(rowCounts),
    distinct_hex_count: corpusStat(hexCounts),
    origin_share: share,
    top_keywords: topKeywordOrLabel(roleSamples, (s) => s.description_first_keywords.join(" ")).slice(0, 30),
    top_labels: topKeywordOrLabel(roleSamples, (s) => s.item_label.toLowerCase()).slice(0, 30),
  };
}

export function buildAccentProfileMap(rows: MatchedRow[], allSystems: readonly string[]): Map<string, SystemAccentProfile> {
  const accentSamples = buildAccentSamples(rows);
  const profiles = profileAccents(accentSamples, allSystems);
  const map = new Map<string, SystemAccentProfile>();
  for (const p of profiles) map.set(p.system, p);
  return map;
}
