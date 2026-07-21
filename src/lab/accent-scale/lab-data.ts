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

/** 레퍼런스 소스별 한 줄 특징 — 랩 UI subtitle (교보재 목적).
 *  근거: docs/research/accent-derivation-survey.md */
export const REF_NOTES: Record<string, string> = {
  tailwind:
    "손튜닝 레퍼런스. 사람이 hue별로 직접 튜닝한 11-stop — 끝단에서 채도를 줄이고 hue를 미세 보정한 결과물. 알고리즘들이 재현하려는 목표가 이 모양이다.",
  radix:
    "손튜닝 레퍼런스. 12-step 각각에 용도가 배정됨 (1-2 배경 · 3-5 컴포넌트 상태 · 6-8 보더 · 9-10 솔리드 · 11-12 텍스트) — 스텝에 의미를 부여하는 설계.",
};

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
