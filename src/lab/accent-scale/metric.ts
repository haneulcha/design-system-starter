// src/lab/accent-scale/metric.ts
//
// 벤치마크 메트릭. ΔE(OK) = Oklab 유클리드 거리 (0 = 동일, ~1 = 흰↔검).
// hue family 경계는 docs/research/accent-baseline.md 와 동일.

import { converter } from "culori";

const toOklab = converter("oklab");

export function deltaEOk(hexA: string, hexB: string): number {
  const a = toOklab(hexA);
  const b = toOklab(hexB);
  if (!a || !b) throw new Error(`unparseable color: ${hexA} / ${hexB}`);
  const dl = (a.l ?? 0) - (b.l ?? 0);
  const da = ((a.a as number) ?? 0) - ((b.a as number) ?? 0);
  const db = ((a.b as number) ?? 0) - ((b.b as number) ?? 0);
  return Math.sqrt(dl * dl + da * da + db * db);
}

export type HueFamily =
  | "red" | "orange" | "yellow" | "green"
  | "cyan" | "blue" | "purple" | "magenta";

const FAMILY_BOUNDS: readonly [HueFamily, number, number][] = [
  ["orange", 20, 50],
  ["yellow", 50, 80],
  ["green", 80, 160],
  ["cyan", 160, 200],
  ["blue", 200, 260],
  ["purple", 260, 310],
  ["magenta", 310, 350],
];

/** OKLCH hue(deg) → family. 350–360 / 0–20 은 red. */
export function hueFamily(h: number): HueFamily {
  const hh = ((h % 360) + 360) % 360;
  for (const [family, lo, hi] of FAMILY_BOUNDS) {
    if (hh >= lo && hh < hi) return family;
  }
  return "red";
}
