// src/lab/accent-scale/ours.ts
//
// "우리 곡선" v0 — 눈 평가(docs/research/accent-eye-eval.md) 종합의 첫 시제품.
//
// 설계 원칙 (평가에서 승격된 요건):
// 1. 앵커 보존 — 입력색은 anchorIndex에 hex 단위로 그대로 남는다 (나이브 뼈대).
//    고정 L 사다리 계열(v1/HCT/Leonardo)이 웜톤에서 무너진 원인이 "입력 L 무시"
//    였으므로, 사다리 전체를 앵커 L에 맞춰 변형한다.
// 2. 곡선 모양은 손튜닝 평균 — L 배치·채도 비율은 tailwind 17개 팔레트를 앵커
//    기준으로 정규화한 평균(OURS_CURVE)을 따른다. 밝은 끝에 앵커 채도의 ~9%를
//    남기는 것(나이브의 "탁한 밝은 끝" 교정), 어두운 끝의 큰 L 점프(900→950)가
//    여기서 온다.
// 3. hue 고정 — 레퍼런스의 hue 드리프트는 평균 ~0°(sd ~10°, 팔레트마다 방향이
//    달라 상쇄)라 v0에서는 고정. 가이드드 빌더의 knob 후보로 이월.
//
// 앵커 워프: 앵커 L을 사다리에 강제로 꽂는 대신, 밝은 끝→앵커 / 앵커→어두운 끝
// 각 구간을 아핀 리매핑한다 — 구간 안 상대 간격(곡선 모양)은 보존되고, 양 끝은
// 손튜닝 끝값에 고정되며, 리매핑이 단조라 사다리가 뒤집히지 않는다.
//
// OURS_CURVE 출처: scripts/analysis/ours-curve-stats.ts (tailwind-v4.json 17종,
// 2026-07-26). 레퍼런스 갱신 시 재생성해 비교할 것.

import { parsePrimary } from "../../generator/color.js";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

// stop 50..950 (11개, 앵커=인덱스 5). l = 평균 L, cMult = 평균 C_i/C_anchor.
const OURS_CURVE: readonly { l: number; cMult: number }[] = [
  { l: 0.9772, cMult: 0.092 },
  { l: 0.9503, cMult: 0.221 },
  { l: 0.9052, cMult: 0.425 },
  { l: 0.8393, cMult: 0.689 },
  { l: 0.7533, cMult: 0.908 },
  { l: 0.6838, cMult: 1.0 },
  { l: 0.6014, cMult: 0.985 },
  { l: 0.518, cMult: 0.872 },
  { l: 0.4469, cMult: 0.732 },
  { l: 0.3948, cMult: 0.593 },
  { l: 0.2777, cMult: 0.42 },
];

const CURVE_ANCHOR = 5;

// 앵커 L이 사다리 끝에 닿으면 구간이 소멸하므로 워프 계산용으로만 안쪽으로 조인다.
// (anchorIndex 자리의 출력은 어차피 입력색 verbatim.)
const ANCHOR_L_MIN = 0.32;
const ANCHOR_L_MAX = 0.93;

/** 0..1 위치 p에서 OURS_CURVE를 구간 선형 보간 */
function sampleCurve(p: number): { l: number; cMult: number } {
  const x = p * (OURS_CURVE.length - 1);
  const i = Math.min(Math.floor(x), OURS_CURVE.length - 2);
  const t = x - i;
  const a = OURS_CURVE[i];
  const b = OURS_CURVE[i + 1];
  return { l: a.l + (b.l - a.l) * t, cMult: a.cMult + (b.cMult - a.cMult) * t };
}

export const oursAlgorithm: AccentAlgorithm = {
  id: "ours",
  label: "우리 곡선 v0 (앵커 워프)",
  description:
    "눈 평가 종합의 시제품. 입력색은 그대로 보존하고(나이브 뼈대), 밝기 배치와 채도 곡선은 tailwind 손튜닝 17종의 평균 모양을 따르되 입력색의 밝기에 맞춰 구간별로 늘였다 줄인다. 밝은 끝에도 색끼를 남긴다.",
  nativeSpec: { count: 11, anchorIndex: 5 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const anchor = parsePrimary(anchorHex);
    const aIdx = spec.anchorIndex;
    const last = spec.count - 1;

    // 스펙 위치 → 기준 곡선 좌표. 앵커 앞/뒤 구간을 각각 곡선의 해당 구간에 대응.
    const curvePos = (i: number): number => {
      if (i === aIdx) return CURVE_ANCHOR / (OURS_CURVE.length - 1);
      if (i < aIdx) {
        const t = aIdx === 0 ? 0 : i / aIdx;
        return (t * CURVE_ANCHOR) / (OURS_CURVE.length - 1);
      }
      const t = (i - aIdx) / (last - aIdx);
      return (CURVE_ANCHOR + t * (OURS_CURVE.length - 1 - CURVE_ANCHOR)) / (OURS_CURVE.length - 1);
    };

    const lightL = OURS_CURVE[0].l;
    const darkL = OURS_CURVE[OURS_CURVE.length - 1].l;
    const baseAnchorL = OURS_CURVE[CURVE_ANCHOR].l;
    const anchorL = Math.min(ANCHOR_L_MAX, Math.max(ANCHOR_L_MIN, anchor.l));

    // 구간별 아핀 리매핑: 곡선 L(밝은끝↔기준앵커↔어두운끝)을
    // (밝은끝↔앵커L↔어두운끝)으로 사상. 각 구간에서 단조 → 사다리 유지.
    const warpL = (baseL: number): number => {
      if (baseL >= baseAnchorL) {
        const t = (lightL - baseL) / (lightL - baseAnchorL); // 0=밝은 끝, 1=앵커
        return lightL - t * (lightL - anchorL);
      }
      const t = (baseAnchorL - baseL) / (baseAnchorL - darkL); // 0=앵커, 1=어두운 끝
      return anchorL - t * (anchorL - darkL);
    };

    return Array.from({ length: spec.count }, (_, i) => {
      if (i === aIdx) return { ...anchor };
      const { l, cMult } = sampleCurve(curvePos(i));
      return { l: warpL(l), c: anchor.c * cMult, h: anchor.h };
    });
  },
};
