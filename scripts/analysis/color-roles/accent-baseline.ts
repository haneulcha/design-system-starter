import { hexToOklch } from "./neutral-baseline.js";
import type { MatchedRow } from "./dictionary.js";

const HUE_CLUSTER_TOLERANCE = 15;
const HUE_SIGNIFICANT_CHROMA = 0.04;

export interface AccentSample {
  system: string;
  hex: string;
  l: number;
  c: number;
  h: number | null;
}

export type HueFamily =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "magenta"
  | "achromatic";

export interface HueCluster {
  primary_h: number;
  stop_count: number;
  l_min: number;
  l_max: number;
  c_max: number;
  c_median: number;
  family: HueFamily;
}

export interface SystemAccentProfile {
  system: string;
  total_stops: number;
  primary: HueCluster | null;
  secondary_clusters: HueCluster[];
  multi_hue: boolean;
  has_no_chromatic_samples: boolean;
}

export interface CorpusStat {
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

export interface CorpusAccentStats {
  systems_total: number;
  systems_single_hue: number;
  systems_multi_hue: number;
  systems_no_chromatic: number;
  total_stops: CorpusStat;
  primary_c_max: CorpusStat;
  primary_l_min: CorpusStat;
  primary_l_max: CorpusStat;
  hue_family_distribution: Record<HueFamily, number>;
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

export function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function chromaWeightedMeanHue(samples: { c: number; h: number | null }[]): number | null {
  let xSum = 0;
  let ySum = 0;
  let weightSum = 0;
  for (const s of samples) {
    if (s.h === null) continue;
    const rad = (s.h * Math.PI) / 180;
    xSum += s.c * Math.cos(rad);
    ySum += s.c * Math.sin(rad);
    weightSum += s.c;
  }
  if (weightSum === 0) return null;
  const meanRad = Math.atan2(ySum, xSum);
  const deg = (meanRad * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

export function classifyHueFamily(h: number | null): HueFamily {
  if (h === null) return "achromatic";
  const norm = ((h % 360) + 360) % 360;
  if (norm >= 350 || norm < 20) return "red";
  if (norm < 50) return "orange";
  if (norm < 80) return "yellow";
  if (norm < 160) return "green";
  if (norm < 200) return "cyan";
  if (norm < 260) return "blue";
  if (norm < 310) return "purple";
  return "magenta";
}

export function buildSamples(rows: MatchedRow[]): Map<string, AccentSample[]> {
  const out = new Map<string, AccentSample[]>();
  for (const row of rows) {
    if (row.matched_role !== "accent" || !row.hex) continue;
    const o = hexToOklch(row.hex);
    if (!o) continue;
    const arr = out.get(row.system) ?? [];
    arr.push({ system: row.system, hex: row.hex, l: o.l, c: o.c, h: o.h });
    out.set(row.system, arr);
  }
  return out;
}

function clusterByHue(chromaticSamples: AccentSample[]): AccentSample[][] {
  const sorted = [...chromaticSamples].sort((a, b) => b.c - a.c);
  const clusters: AccentSample[][] = [];
  const claimed = new Set<AccentSample>();
  for (const seed of sorted) {
    if (claimed.has(seed) || seed.h === null) continue;
    const cluster: AccentSample[] = [seed];
    claimed.add(seed);
    for (const candidate of sorted) {
      if (claimed.has(candidate) || candidate.h === null) continue;
      if (circularDistance(seed.h, candidate.h) <= HUE_CLUSTER_TOLERANCE) {
        cluster.push(candidate);
        claimed.add(candidate);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

function buildCluster(
  chromatic: AccentSample[],
  allSamples: AccentSample[],
): HueCluster {
  const primaryH = chromaWeightedMeanHue(chromatic) ?? chromatic[0].h ?? 0;
  const stops = allSamples.filter((s) => {
    if (s.h === null) return false;
    return circularDistance(primaryH, s.h) <= HUE_CLUSTER_TOLERANCE * 2;
  });
  const seedSet = new Set(chromatic.map((s) => s.hex));
  for (const s of chromatic) {
    if (!stops.find((t) => t.hex === s.hex)) {
      stops.push(s);
      seedSet.add(s.hex);
    }
  }
  const ls = stops.map((s) => s.l);
  const cs = stops.map((s) => s.c);
  return {
    primary_h: primaryH,
    stop_count: stops.length,
    l_min: ls.length > 0 ? Math.min(...ls) : 0,
    l_max: ls.length > 0 ? Math.max(...ls) : 0,
    c_max: cs.length > 0 ? Math.max(...cs) : 0,
    c_median: median(cs),
    family: classifyHueFamily(primaryH),
  };
}

export function profileSystem(system: string, samples: AccentSample[]): SystemAccentProfile {
  if (samples.length === 0) {
    return {
      system,
      total_stops: 0,
      primary: null,
      secondary_clusters: [],
      multi_hue: false,
      has_no_chromatic_samples: true,
    };
  }
  const chromatic = samples.filter((s) => s.c >= HUE_SIGNIFICANT_CHROMA && s.h !== null);
  if (chromatic.length === 0) {
    return {
      system,
      total_stops: samples.length,
      primary: null,
      secondary_clusters: [],
      multi_hue: false,
      has_no_chromatic_samples: true,
    };
  }
  const clusters = clusterByHue(chromatic);
  const sortedClusters = clusters.sort((a, b) => b.length - a.length);
  const built = sortedClusters.map((c) => buildCluster(c, samples));
  const [primary, ...rest] = built;
  return {
    system,
    total_stops: samples.length,
    primary,
    secondary_clusters: rest,
    multi_hue: rest.length >= 1,
    has_no_chromatic_samples: false,
  };
}

export function profileAll(
  samplesBySystem: Map<string, AccentSample[]>,
  allSystems: readonly string[],
): SystemAccentProfile[] {
  return allSystems.map((s) => profileSystem(s, samplesBySystem.get(s) ?? []));
}

export function corpusStats(profiles: SystemAccentProfile[]): CorpusAccentStats {
  const withPrimary = profiles.filter((p) => p.primary !== null);
  const noChromatic = profiles.filter((p) => p.has_no_chromatic_samples).length;
  const familyDist: Record<HueFamily, number> = {
    red: 0, orange: 0, yellow: 0, green: 0, cyan: 0, blue: 0, purple: 0, magenta: 0, achromatic: 0,
  };
  for (const p of withPrimary) familyDist[p.primary!.family] += 1;
  return {
    systems_total: profiles.length,
    systems_single_hue: profiles.filter((p) => p.primary && !p.multi_hue).length,
    systems_multi_hue: profiles.filter((p) => p.multi_hue).length,
    systems_no_chromatic: noChromatic,
    total_stops: corpusStat(profiles.filter((p) => p.total_stops > 0).map((p) => p.total_stops)),
    primary_c_max: corpusStat(withPrimary.map((p) => p.primary!.c_max)),
    primary_l_min: corpusStat(withPrimary.map((p) => p.primary!.l_min)),
    primary_l_max: corpusStat(withPrimary.map((p) => p.primary!.l_max)),
    hue_family_distribution: familyDist,
  };
}
