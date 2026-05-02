import { converter } from "culori";
import type { MatchedRow } from "./dictionary.js";

const toOklch = converter("oklch");

export const IMPLICIT_CHROMA_MAX = 0.025;
const TINT_CHROMA_MIN = 0.005;

export interface NeutralSample {
  system: string;
  source: "explicit" | "implicit";
  hex: string;
  l: number;
  c: number;
  h: number | null;
}

export type Tint = "warm" | "cool" | "green" | "purple" | "achromatic";

export interface SystemNeutralProfile {
  system: string;
  source: "explicit" | "implicit" | "none";
  stop_count: number;
  l_min: number;
  l_max: number;
  l_stops_sorted: number[];
  c_max: number;
  c_median: number;
  tint: Tint;
  h_at_c_max: number | null;
}

export interface CorpusStat {
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

export interface CorpusNeutralStats {
  systems_total: number;
  systems_with_explicit: number;
  systems_with_implicit_only: number;
  systems_with_none: number;
  stop_count: CorpusStat;
  l_min: CorpusStat;
  l_max: CorpusStat;
  l_range: CorpusStat;
  c_max: CorpusStat;
  tint_distribution: Record<Tint, number>;
}

export function hexToOklch(hex: string): { l: number; c: number; h: number | null } | null {
  const o = toOklch(hex);
  if (!o) return null;
  const l = o.l ?? 0;
  const c = o.c ?? 0;
  const h = o.h ?? null;
  return { l, c, h };
}

function classifyTint(cMax: number, h: number | null): Tint {
  if (cMax < TINT_CHROMA_MIN || h === null) return "achromatic";
  const norm = ((h % 360) + 360) % 360;
  if (norm >= 330 || norm < 70) return "warm";
  if (norm >= 70 && norm < 180) return "green";
  if (norm >= 180 && norm < 280) return "cool";
  return "purple";
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

export function buildSamples(rows: MatchedRow[]): Map<string, NeutralSample[]> {
  const bySystem = new Map<string, MatchedRow[]>();
  for (const row of rows) {
    const arr = bySystem.get(row.system) ?? [];
    arr.push(row);
    bySystem.set(row.system, arr);
  }

  const out = new Map<string, NeutralSample[]>();
  for (const [system, sysRows] of bySystem) {
    const explicit = sysRows.filter((r) => r.matched_role === "neutral" && r.hex);
    const samples: NeutralSample[] = [];

    if (explicit.length > 0) {
      for (const row of explicit) {
        const o = hexToOklch(row.hex!);
        if (!o) continue;
        samples.push({ system, source: "explicit", hex: row.hex!, l: o.l, c: o.c, h: o.h });
      }
    } else {
      const candidates = sysRows.filter(
        (r) => (r.matched_role === "surface" || r.matched_role === "text") && r.hex,
      );
      for (const row of candidates) {
        const o = hexToOklch(row.hex!);
        if (!o) continue;
        if (o.c > IMPLICIT_CHROMA_MAX) continue;
        samples.push({ system, source: "implicit", hex: row.hex!, l: o.l, c: o.c, h: o.h });
      }
    }

    if (samples.length > 0) out.set(system, samples);
  }
  return out;
}

function dedupeByLightness(samples: NeutralSample[], precision = 3): NeutralSample[] {
  const seen = new Set<number>();
  const result: NeutralSample[] = [];
  for (const s of samples) {
    const key = Number(s.l.toFixed(precision));
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(s);
  }
  return result;
}

export function profileSystem(system: string, samples: NeutralSample[]): SystemNeutralProfile {
  if (samples.length === 0) {
    return {
      system,
      source: "none",
      stop_count: 0,
      l_min: 0,
      l_max: 0,
      l_stops_sorted: [],
      c_max: 0,
      c_median: 0,
      tint: "achromatic",
      h_at_c_max: null,
    };
  }
  const unique = dedupeByLightness(samples);
  const ls = unique.map((s) => s.l);
  const cs = unique.map((s) => s.c);
  let cMax = 0;
  let hAtCMax: number | null = null;
  for (const s of unique) {
    if (s.c > cMax) {
      cMax = s.c;
      hAtCMax = s.h;
    }
  }
  return {
    system,
    source: unique[0].source,
    stop_count: unique.length,
    l_min: Math.min(...ls),
    l_max: Math.max(...ls),
    l_stops_sorted: [...ls].sort((a, b) => a - b),
    c_max: cMax,
    c_median: median(cs),
    tint: classifyTint(cMax, hAtCMax),
    h_at_c_max: hAtCMax,
  };
}

export function profileAll(
  samplesBySystem: Map<string, NeutralSample[]>,
  allSystems: readonly string[],
): SystemNeutralProfile[] {
  const profiles: SystemNeutralProfile[] = [];
  for (const system of allSystems) {
    const samples = samplesBySystem.get(system) ?? [];
    profiles.push(profileSystem(system, samples));
  }
  return profiles;
}

export function corpusStats(profiles: SystemNeutralProfile[]): CorpusNeutralStats {
  const present = profiles.filter((p) => p.source !== "none");
  const explicit = profiles.filter((p) => p.source === "explicit");
  const implicit = profiles.filter((p) => p.source === "implicit");
  const none = profiles.filter((p) => p.source === "none");
  const tintDist: Record<Tint, number> = { warm: 0, cool: 0, green: 0, purple: 0, achromatic: 0 };
  for (const p of present) tintDist[p.tint] += 1;
  return {
    systems_total: profiles.length,
    systems_with_explicit: explicit.length,
    systems_with_implicit_only: implicit.length,
    systems_with_none: none.length,
    stop_count: corpusStat(present.map((p) => p.stop_count)),
    l_min: corpusStat(present.map((p) => p.l_min)),
    l_max: corpusStat(present.map((p) => p.l_max)),
    l_range: corpusStat(present.map((p) => p.l_max - p.l_min)),
    c_max: corpusStat(present.map((p) => p.c_max)),
    tint_distribution: tintDist,
  };
}

export function corpusStatsBySource(
  profiles: SystemNeutralProfile[],
  source: "explicit" | "implicit",
): CorpusNeutralStats {
  return corpusStats(profiles.filter((p) => p.source === source));
}
