// src/lab/accent-scale/lab-data.ts
//
// 랩 UI용 순수 데이터 변환. 렌더 로직 없음 (FP/분리 원칙).

import { converter } from "culori";
import { oklchToHex, parsePrimary } from "../../generator/color.js";
import type { ReferenceSet } from "./bench.js";
import type { AccentAlgorithm } from "./types.js";

const toOklch = converter("oklch");

export interface LabStop {
  key: string;
  hex: string;
}

/** 알고리즘의 native stop 구성으로 유도해 표시용 stop 배열 생성 */
export function nativeScale(algo: AccentAlgorithm, hex: string): LabStop[] {
  const scale = algo.derive(hex, algo.nativeSpec);
  return scale.map((c, i) => ({ key: String(i + 1), hex: oklchToHex(c) }));
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export interface NearestReference {
  source: string;
  palette: string;
  stops: LabStop[];
}

/** 입력 색과 앵커 hue가 가장 가까운 팔레트를 소스(tailwind/radix)별 1개씩 */
export function nearestReferences(
  hex: string,
  refSets: readonly ReferenceSet[],
): NearestReference[] {
  const inputH = parsePrimary(hex).h;
  return refSets.map((ref) => {
    let best: { name: string; d: number } | null = null;
    for (const [name, hexes] of Object.entries(ref.palettes)) {
      const anchorH = toOklch(hexes[ref.anchorIndex])?.h ?? 0;
      const d = hueDistance(inputH, anchorH);
      if (!best || d < best.d) best = { name, d };
    }
    const hexes = ref.palettes[best!.name];
    return {
      source: ref.source,
      palette: best!.name,
      stops: hexes.map((h, i) => ({ key: ref.stopKeys[i], hex: h })),
    };
  });
}
