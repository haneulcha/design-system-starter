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
    "손튜닝 레퍼런스. 사람이 색 계열마다 11단계를 직접 다듬은 결과물 — 밝은 끝·어두운 끝에서 채도를 줄이고 색상을 미세 조정했다. 알고리즘들이 흉내 내려는 목표가 이 모양이다.",
  radix:
    "손튜닝 레퍼런스. 12단계 각각에 쓰임새가 정해져 있다 (1-2 배경 · 3-5 버튼 상태 · 6-8 테두리 · 9-10 진한 배경 · 11-12 글자) — 단계에 의미를 부여하는 설계.",
};

/** 하단 용어 섹션 (교보재). [용어, 풀이] 순서 유지 렌더. */
export const GLOSSARY: readonly [string, string][] = [
  ["앵커", "내가 입력한 브랜드 컬러. 스케일이 이 색을 기준으로 만들어진다"],
  ["스케일 · 단계(stop)", "한 색에서 파생시킨 밝은→어두운 색 묶음. 그 안의 칸 하나가 stop"],
  ["밝기 (L)", "색이 얼마나 밝은가. 0(검정)~1(흰색)"],
  ["채도 (C)", "색이 얼마나 쨍한가. 0이면 회색, 높을수록 선명"],
  ["색상 (H, hue)", "빨강·파랑 같은 색 계열. 원형 각도(0~360°)로 표현"],
  ["OKLCH", "밝기·채도·색상을 사람 눈 기준으로 고르게 다루도록 설계된 색 좌표계 — 이 랩의 기본 언어"],
  ["HCT / CAM16", "구글 머티리얼이 쓰는 또 다른 지각 색공간. tone이 밝기에 해당"],
  ["콘트라스트 비율", "두 색의 밝기 대비 수치(1~21). 글자 가독성 접근성 기준(WCAG)에 쓰인다"],
  ["sRGB", "일반 모니터가 낼 수 있는 색 범위. 이 범위를 넘는 색은 가장 가까운 표현 가능한 색으로 잘려서 보인다 — 피커 오른쪽 끝에서 색이 안 변하는 이유"],
  ["ΔE", "두 색이 얼마나 달라 보이는지의 거리. 벤치마크 리포트에서 재현력 점수로 사용"],
];

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
